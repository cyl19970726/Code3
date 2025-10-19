# Development Constitution

## Testing Requirements
- Write tests before implementation (TDD)
- Minimum test coverage: 80%
- All tests must pass before committing

## Code Quality
- Use TypeScript strict mode
- Follow ESLint + Prettier rules
- No `any` types without justification

## Commit Standards
- Follow Conventional Commits
- Types: feat, fix, docs, test, refactor, chore
- Include issue references when applicable

## Documentation
- Update README for new features
- Document API changes
- Add inline comments for complex logic

## Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user inputs
