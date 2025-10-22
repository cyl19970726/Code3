use anchor_lang::prelude::*;

#[error_code]
pub enum BountyError {
    #[msg("Invalid bounty status for this operation")]
    InvalidBountyStatus,

    #[msg("Only the sponsor can perform this action")]
    UnauthorizedSponsor,

    #[msg("Only the worker can perform this action")]
    UnauthorizedWorker,

    #[msg("Bounty has already been accepted by another worker")]
    BountyAlreadyAccepted,

    #[msg("Worker has not submitted work yet")]
    WorkNotSubmitted,

    #[msg("Work has not been confirmed by sponsor")]
    WorkNotConfirmed,

    #[msg("Bounty amount must be greater than zero")]
    InvalidAmount,

    #[msg("Task ID exceeds maximum length")]
    TaskIdTooLong,

    #[msg("Task URL exceeds maximum length")]
    TaskUrlTooLong,

    #[msg("Submission URL exceeds maximum length")]
    SubmissionUrlTooLong,

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,

    #[msg("Unauthorized authority")]
    UnauthorizedAuthority,
}
