# POC Test Plan

## Manual Smoke Test

1. Start app with `npm run start`.
2. Login with mock user.
3. Verify neighborhood.
4. Open a gonggu from the list.
5. Join the gonggu.
6. Open chat and send a message.
7. Open settlement status.
8. Return to detail and confirm pickup.
9. Submit required review.
10. Confirm settlement state becomes `지급가능`.

## Automated Tests To Add

- price per person calculation
- join/cancel capacity guard
- pickup confirmation state transition
- review submission state transition
- settlement release condition

