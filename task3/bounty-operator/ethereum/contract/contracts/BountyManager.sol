// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BountyManager
 * @notice 管理任务赏金的完整生命周期
 * @dev 支持 ETH 和 ERC20 代币作为赏金资产
 *
 * 状态机：Open → Accepted → Submitted → Confirmed → Claimed
 * 冷却期：确认后 7 天才能领取
 */
contract BountyManager is ReentrancyGuard, Ownable {
    // ========== 状态枚举 ==========

    enum BountyStatus {
        Open,       // 0: 已创建，等待接受
        Accepted,   // 1: 已接受，工作中
        Submitted,  // 2: 已提交，等待确认
        Confirmed,  // 3: 已确认，冷却期中
        Claimed,    // 4: 已领取
        Cancelled   // 5: 已取消
    }

    // ========== 数据结构 ==========

    struct Bounty {
        uint256 bountyId;
        string taskId;
        bytes32 taskHash;
        address requester;
        address worker;
        uint256 amount;
        address asset; // address(0) 表示 ETH，其他为 ERC20 地址
        BountyStatus status;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 submittedAt;
        string submissionUrl;
        uint256 confirmedAt;
        uint256 coolingUntil;
        uint256 claimedAt;
    }

    // ========== 状态变量 ==========

    uint256 private nextBountyId = 1;
    mapping(uint256 => Bounty) public bounties;
    mapping(bytes32 => uint256) public taskHashToBountyId;
    mapping(address => uint256[]) public requesterBounties;
    mapping(address => uint256[]) public workerBounties;

    uint256 public constant COOLING_PERIOD = 7 days;

    // ========== 事件 ==========

    event BountyCreated(
        uint256 indexed bountyId,
        string taskId,
        bytes32 taskHash,
        address indexed requester,
        uint256 amount,
        address asset
    );

    event BountyAccepted(
        uint256 indexed bountyId,
        address indexed worker,
        uint256 acceptedAt
    );

    event BountySubmitted(
        uint256 indexed bountyId,
        string submissionUrl,
        uint256 submittedAt
    );

    event BountyConfirmed(
        uint256 indexed bountyId,
        uint256 confirmedAt,
        uint256 coolingUntil
    );

    event BountyClaimed(
        uint256 indexed bountyId,
        address indexed worker,
        uint256 amount,
        uint256 claimedAt
    );

    event BountyCancelled(
        uint256 indexed bountyId,
        address indexed requester,
        uint256 cancelledAt
    );

    // ========== 构造函数 ==========

    constructor() Ownable(msg.sender) {}

    // ========== 核心功能 ==========

    /**
     * @notice 创建 Bounty（ETH 作为赏金）
     * @param taskId 任务 ID（来自 GitHub Issue 或其他数据层）
     * @param taskHash 任务内容哈希（用于幂等性检查）
     * @return bountyId 创建的 Bounty ID
     */
    function createBounty(
        string memory taskId,
        bytes32 taskHash
    ) external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Amount must be greater than 0");
        require(taskHashToBountyId[taskHash] == 0, "Bounty already exists for this task");

        uint256 bountyId = nextBountyId++;

        bounties[bountyId] = Bounty({
            bountyId: bountyId,
            taskId: taskId,
            taskHash: taskHash,
            requester: msg.sender,
            worker: address(0),
            amount: msg.value,
            asset: address(0), // ETH
            status: BountyStatus.Open,
            createdAt: block.timestamp,
            acceptedAt: 0,
            submittedAt: 0,
            submissionUrl: "",
            confirmedAt: 0,
            coolingUntil: 0,
            claimedAt: 0
        });

        taskHashToBountyId[taskHash] = bountyId;
        requesterBounties[msg.sender].push(bountyId);

        emit BountyCreated(bountyId, taskId, taskHash, msg.sender, msg.value, address(0));

        return bountyId;
    }

    /**
     * @notice 创建 Bounty（ERC20 代币作为赏金）
     * @param taskId 任务 ID
     * @param taskHash 任务内容哈希
     * @param asset ERC20 代币地址
     * @param amount 代币数量
     * @return bountyId 创建的 Bounty ID
     */
    function createBountyWithToken(
        string memory taskId,
        bytes32 taskHash,
        address asset,
        uint256 amount
    ) external nonReentrant returns (uint256) {
        require(asset != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(taskHashToBountyId[taskHash] == 0, "Bounty already exists for this task");

        // 转移代币到合约（需要事先 approve）
        require(
            IERC20(asset).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        uint256 bountyId = nextBountyId++;

        bounties[bountyId] = Bounty({
            bountyId: bountyId,
            taskId: taskId,
            taskHash: taskHash,
            requester: msg.sender,
            worker: address(0),
            amount: amount,
            asset: asset,
            status: BountyStatus.Open,
            createdAt: block.timestamp,
            acceptedAt: 0,
            submittedAt: 0,
            submissionUrl: "",
            confirmedAt: 0,
            coolingUntil: 0,
            claimedAt: 0
        });

        taskHashToBountyId[taskHash] = bountyId;
        requesterBounties[msg.sender].push(bountyId);

        emit BountyCreated(bountyId, taskId, taskHash, msg.sender, amount, asset);

        return bountyId;
    }

    /**
     * @notice 接受 Bounty（由 requester 指定 worker）
     * @param bountyId Bounty ID
     * @param worker 工作者地址
     */
    function acceptBounty(uint256 bountyId, address worker) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.bountyId != 0, "Bounty not found");
        require(bounty.status == BountyStatus.Open, "Bounty not open");
        require(msg.sender == bounty.requester, "Only requester can accept");
        require(worker != address(0), "Invalid worker address");

        bounty.worker = worker;
        bounty.status = BountyStatus.Accepted;
        bounty.acceptedAt = block.timestamp;

        workerBounties[worker].push(bountyId);

        emit BountyAccepted(bountyId, worker, block.timestamp);
    }

    /**
     * @notice 提交工作成果（由 worker 提交）
     * @param bountyId Bounty ID
     * @param submissionUrl 提交 URL（GitHub PR 等）
     */
    function submitBounty(uint256 bountyId, string memory submissionUrl) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.bountyId != 0, "Bounty not found");
        require(bounty.status == BountyStatus.Accepted, "Bounty not accepted");
        require(msg.sender == bounty.worker, "Only worker can submit");
        require(bytes(submissionUrl).length > 0, "Submission URL required");

        bounty.status = BountyStatus.Submitted;
        bounty.submittedAt = block.timestamp;
        bounty.submissionUrl = submissionUrl;

        emit BountySubmitted(bountyId, submissionUrl, block.timestamp);
    }

    /**
     * @notice 确认工作成果（进入冷却期）
     * @param bountyId Bounty ID
     * @param confirmedAt 确认时间戳
     */
    function confirmBounty(uint256 bountyId, uint256 confirmedAt) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.bountyId != 0, "Bounty not found");
        require(bounty.status == BountyStatus.Submitted, "Bounty not submitted");
        require(msg.sender == bounty.requester, "Only requester can confirm");
        require(confirmedAt > 0, "Invalid confirmed timestamp");

        bounty.status = BountyStatus.Confirmed;
        bounty.confirmedAt = confirmedAt;
        bounty.coolingUntil = confirmedAt + COOLING_PERIOD;

        emit BountyConfirmed(bountyId, confirmedAt, bounty.coolingUntil);
    }

    /**
     * @notice 领取赏金（冷却期结束后）
     * @param bountyId Bounty ID
     */
    function claimBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.bountyId != 0, "Bounty not found");
        require(bounty.status == BountyStatus.Confirmed, "Bounty not confirmed");
        require(msg.sender == bounty.worker, "Only worker can claim");
        require(block.timestamp >= bounty.coolingUntil, "Cooling period not ended");

        bounty.status = BountyStatus.Claimed;
        bounty.claimedAt = block.timestamp;

        // 转账
        if (bounty.asset == address(0)) {
            // ETH
            (bool success, ) = bounty.worker.call{value: bounty.amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20
            require(
                IERC20(bounty.asset).transfer(bounty.worker, bounty.amount),
                "Token transfer failed"
            );
        }

        emit BountyClaimed(bountyId, bounty.worker, bounty.amount, block.timestamp);
    }

    /**
     * @notice 取消 Bounty（仅在 Open 状态）
     * @param bountyId Bounty ID
     */
    function cancelBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.bountyId != 0, "Bounty not found");
        require(bounty.status == BountyStatus.Open, "Can only cancel open bounty");
        require(msg.sender == bounty.requester, "Only requester can cancel");

        bounty.status = BountyStatus.Cancelled;

        // 退款
        if (bounty.asset == address(0)) {
            (bool success, ) = bounty.requester.call{value: bounty.amount}("");
            require(success, "ETH refund failed");
        } else {
            require(
                IERC20(bounty.asset).transfer(bounty.requester, bounty.amount),
                "Token refund failed"
            );
        }

        emit BountyCancelled(bountyId, bounty.requester, block.timestamp);
    }

    // ========== 查询功能 ==========

    /**
     * @notice 获取 Bounty 详情
     * @param bountyId Bounty ID
     * @return Bounty 结构体
     */
    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        require(bounties[bountyId].bountyId != 0, "Bounty not found");
        return bounties[bountyId];
    }

    /**
     * @notice 通过 taskHash 查询 Bounty
     * @param taskHash 任务内容哈希
     * @return exists 是否存在
     * @return bountyId Bounty ID
     */
    function getBountyByTaskHash(bytes32 taskHash) external view returns (bool exists, uint256 bountyId) {
        bountyId = taskHashToBountyId[taskHash];
        exists = bountyId != 0;
    }

    /**
     * @notice 获取 requester 的所有 Bounty
     * @param requester 请求者地址
     * @return Bounty ID 数组
     */
    function getBountiesByRequester(address requester) external view returns (uint256[] memory) {
        return requesterBounties[requester];
    }

    /**
     * @notice 获取 worker 的所有 Bounty
     * @param worker 工作者地址
     * @return Bounty ID 数组
     */
    function getBountiesByWorker(address worker) external view returns (uint256[] memory) {
        return workerBounties[worker];
    }

    /**
     * @notice 获取指定状态的所有 Bounty
     * @param status Bounty 状态
     * @return Bounty ID 数组
     */
    function getBountiesByStatus(BountyStatus status) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextBountyId; i++) {
            if (bounties[i].status == status) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextBountyId; i++) {
            if (bounties[i].status == status) {
                result[index++] = i;
            }
        }

        return result;
    }

    /**
     * @notice 获取所有 Bounty（分页）
     * @param offset 起始位置
     * @param limit 数量限制
     * @return Bounty ID 数组
     */
    function listBounties(uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        require(offset < nextBountyId, "Offset out of range");

        uint256 remaining = nextBountyId - offset - 1;
        uint256 count = remaining < limit ? remaining : limit;

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = offset + i + 1;
        }

        return result;
    }
}
