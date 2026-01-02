# Implementation Plan

- [x] 1. Update data models and database schema

  - Add new feature limit columns to organizations table
  - Remove SMS monthly limit dependencies from existing queries
  - Create migration scripts for existing organizations
  - Update Go models to reflect new schema
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]\* 1.1 Write property test for data model migration

  - **Property 1: SMS processing without monthly quotas**
  - **Validates: Requirements 1.1, 1.3**

- [x] 2. Modify rate limiting service to remove SMS monthly quotas

  - Remove monthly quota checks from AllowRequest method
  - Preserve burst rate limiting functionality
  - Add feature limit checking for applications, contacts, campaigns
  - Update rate limiter tests to reflect new behavior
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.5_

- [ ]\* 2.1 Write property test for burst rate limiting

  - **Property 3: Burst rate limiting behavior**
  - **Validates: Requirements 2.1, 2.2**

- [ ]\* 2.2 Write property test for feature limit enforcement

  - **Property 4: Feature limit enforcement**
  - **Validates: Requirements 2.5, 3.1, 3.2, 3.3, 3.4**

- [x] 3. Implement enhanced pricing engine

  - Create per-SMS cost calculation functions
  - Implement plan-based feature limit validation
  - Add volume discount calculations for higher tiers
  - Update plan definitions with new limit structure
  - _Requirements: 1.2, 6.1, 6.4, 3.1, 3.2, 3.3, 3.4_

- [ ]\* 3.1 Write property test for SMS cost calculations

  - **Property 2: Per-SMS cost calculation accuracy**
  - **Validates: Requirements 1.2, 6.1, 6.4**

- [x] 4. Update usage tracking system

  - Modify usage tracker to record per-SMS costs
  - Add support for different usage types (SMS, application, contact, campaign)
  - Ensure accurate timestamp and cost recording
  - Update usage aggregation for billing purposes
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]\* 4.1 Write property test for usage tracking accuracy

  - **Property 6: Usage tracking accuracy**
  - **Validates: Requirements 4.1**

- [x] 5. Implement feature limit manager

  - Create service to enforce application creation limits
  - Add contact storage limit validation
  - Implement campaign creation and recipient limits
  - Integrate with existing services (application, contact, campaign services)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.1 Write property test for unlimited SMS within constraints

  - **Property 5: Unlimited SMS within feature constraints**
  - **Validates: Requirements 3.5**

- [x] 6. Update billing system integration

  - Modify billing calculations to use actual usage instead of subscription fees
  - Update invoice generation to show per-SMS breakdowns
  - Ensure transparent cost reporting for customers
  - Integrate with Stripe for usage-based billing
  - _Requirements: 1.4, 4.2, 4.4_

- [x]\* 6.1 Write property test for billing calculation accuracy

  - **Property 7: Billing calculation accuracy**
  - **Validates: Requirements 1.4, 4.2, 4.4**

- [x] 7. Implement plan upgrade/downgrade functionality

  - Add immediate rate application for plan changes
  - Update feature limits when plans change
  - Handle enterprise unlimited features correctly
  - Ensure smooth transitions between plan tiers
  - _Requirements: 6.2, 6.3, 6.5_

- [x]\* 7.1 Write property test for plan upgrade rate application

  - **Property 8: Plan upgrade rate application**
  - **Validates: Requirements 6.2**

- [x]\* 7.2 Write property test for plan-based limit updates

  - **Property 9: Plan-based limit updates**
  - **Validates: Requirements 6.3, 6.5**

- [x] 8. Update frontend components

  - Remove SMS monthly limit displays from organization pages
  - Add feature limit displays (applications, contacts, campaigns)
  - Update pricing pages to show per-SMS rates
  - Modify usage dashboards to show cost-based metrics
  - _Requirements: 4.3, 6.1_

- [x] 9. Create database migration scripts

  - Write migration to add new feature limit columns
  - Create script to remove SMS monthly limit constraints
  - Populate new feature limits based on existing plans
  - Ensure backward compatibility during transition
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. Update API endpoints

  - Modify organization endpoints to return new limit structure
  - Update plan endpoints to show per-SMS pricing
  - Add feature limit validation to creation endpoints
  - Ensure API backward compatibility where possible
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1_

- [x] 11. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integration testing and validation

  - Test complete SMS flow without monthly limits
  - Validate feature limits work across all services
  - Verify billing calculations with real usage data
  - Test plan upgrade/downgrade scenarios end-to-end
  - _Requirements: All requirements validation_

- [x]\* 12.1 Write integration tests for complete SMS flow

  - Test SMS processing from API to billing without monthly restrictions
  - Validate feature limits are enforced across service boundaries
  - _Requirements: 1.1, 1.3, 3.5_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
