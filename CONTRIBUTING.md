# Contributing to TravelRouter Admin

Thank you for your interest in contributing!

## Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run lint and build checks
5. Submit a pull request

## Requirements

- All phases must pass validation before merging
- Design tokens must follow `DESIGN.md` exactly
- No `box-shadow` - use border hierarchy only
- Typography: weight 400/500, specific line-heights per element

## Validation Checklist

Before submitting a PR, ensure:
- [ ] `npm run lint` passes with zero errors
- [ ] `cargo check` compiles cleanly
- [ ] `npm run build` succeeds
- [ ] UI follows design tokens from DESIGN.md

## Pull Request Process

1. Update documentation if needed
2. Ensure all checks pass
3. Request review from maintainers