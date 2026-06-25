# React Native Architecture

## Decision

The POC uses React Native, Expo, and TypeScript so development can continue in VSCode without Android Studio.

## Layers

- `src/shell`: app shell and navigation state
- `src/entities`: future domain-specific entity modules
- `src/features`: future screen-level feature modules
- `src/services/mock`: in-memory POC repository
- `src/services/firebase`: Firebase adapter boundary
- `src/shared`: design tokens, UI helpers, formatters
- `src/types`: shared domain types

## Current Flow

```text
mock login
  -> location verification mock
  -> home list/map placeholder
  -> gonggu detail
  -> join gonggu
  -> chat
  -> settlement state
  -> pickup confirmation
  -> required review
  -> settlement releasable
```

## Firebase Boundary

Client reads can use Firestore directly where safe. Mutations that affect trusted state should go through Cloud Functions:

- join/cancel participation
- recruitment status changes
- pickup confirmation
- review submission and trust score updates
- settlement/payment/payout state changes
