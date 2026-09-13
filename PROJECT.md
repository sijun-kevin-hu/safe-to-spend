# Safe to Spend

## Overview

Safe to Spend is a privacy-first mobile app that gives users one clear answer: how much money they can safely spend after accounting for upcoming bills and a savings goal.

The app is based on personal-finance interviews conducted for CS4261. Most interviewees relied on banking apps to check balances and transactions but did not consistently budget. Common barriers included effort, boredom, stress, variable income, forgetting to update a tracker, and privacy concerns about connecting financial accounts. The product should complement banking apps instead of duplicating them.

## Product Objective

Help people make a quick spending decision without requiring them to track every transaction, create detailed categories, or connect a bank account.

The core calculation is:

```text
safe to spend = current balance - upcoming bills - savings goal
```

## Product Principles

- Low effort: require only the information needed for the next spending decision.
- Forward-looking: emphasize upcoming obligations and savings rather than past transaction reports.
- Calm: present a clear answer without making budgeting feel stressful or judgmental.
- Privacy-first: do not require direct access to bank or credit-card accounts.
- Focused: avoid becoming a general-purpose expense tracker or accounting tool.

## MVP Objectives

- Enter a current available balance.
- Enter upcoming bills.
- Set a savings goal.
- Calculate and prominently display the safe-to-spend amount.
- Handle blank and decimal inputs safely.
- Run and test the application on a physical mobile device through Expo.
- Store and retrieve relevant data through a backend REST API.
- Maintain clear Git history and support the required partner collaboration workflow.

## Deferred Features

- Direct bank connections
- Investment tracking
- Complex expense categories
- Full accounting features
- AI-generated financial advice
- Detailed manual transaction tracking

## Possible Stretch Features

- Add individual upcoming bills with names and due dates.
- Support a savings percentage for users with variable income.
- Warn when a planned purchase would reduce safe-to-spend below a chosen threshold.
- Schedule a native notification for an upcoming bill or low safe-to-spend amount.
- Show a lightweight monthly summary without requiring detailed expense entry.

## Course Requirements to Demonstrate

- Develop with a mobile development environment.
- Run an interactive application on a physical device.
- Keep the mobile app and backend in revision control.
- Deploy a backend service that processes, stores, or exchanges data through a REST API.
- Complete the two-way partner clone, build, modify, test, deploy, commit, and pull workflow.
- Document references, AI assistance, debugging, pivots, screenshots or video, setup instructions, repository and API URLs, and collaboration lessons.

## Current Technical Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- Expo Router
- Git and GitHub

## Current Progress

- Expo project created and connected to Expo Application Services.
- Git repository created and connected to GitHub.
- Default home screen replaced with a Safe to Spend form.
- Current balance, upcoming bills, and savings goal inputs added.
- Safe-to-spend calculation implemented.
- Blank inputs treated as zero.
- TypeScript and whitespace checks pass for the initial calculator milestone.

## Next Steps

1. Verify the calculator on a physical device and capture evidence.
2. Commit and push the initial calculator milestone.
3. Improve validation and the result presentation.
4. Model upcoming bills as individual items with names, amounts, and due dates.
5. Add persistence through a backend REST API.
6. Complete and document the partner collaboration workflow.

## Development Approach

The user is learning Expo and React Native by implementing the code. Assistance should provide explanations, small next steps, targeted review, and debugging guidance without taking over routine implementation.
