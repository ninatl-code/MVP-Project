# Testing Checklist - Phase 1 & Phase 2 Features

## Feature 1: Advanced Calendar & Instant Booking

### Provider Side

- [ ] Create/edit availability slots
- [ ] Block specific dates/times
- [ ] Configure instant booking settings (min notice, max advance, buffer time)
- [ ] View calendar with color-coded slots (available/booked/blocked)
- [ ] Receive real-time booking notifications
- [ ] Handle booking conflicts

### Client Side

- [ ] View provider availability calendar
- [ ] Select date and time slot
- [ ] Instant booking confirmation
- [ ] Real-time slot updates during selection
- [ ] Payment integration on booking

## Feature 2: Two-way Review System

### Client Reviews

- [ ] Submit review after service completion
- [ ] Rate overall + detailed (communication, professionalism, value)
- [ ] Add comment and photos (max 5)
- [ ] Edit review within time limit
- [ ] View all provider reviews with stats

### Provider Responses

- [ ] View pending reviews dashboard
- [ ] Respond to client reviews
- [ ] View response statistics
- [ ] Filter reviews (all/pending/responded)
- [ ] Receive notifications for new reviews

### Display

- [ ] Average rating calculation
- [ ] Rating distribution bars
- [ ] Review sorting/filtering
- [ ] Photo gallery in reviews

## Feature 3: Trust & Safety ID Verification

### Provider Verification

- [ ] Upload identity documents (ID card, business license, insurance, address proof)
- [ ] View trust score (0-100)
- [ ] Track verification status (pending/approved/rejected)
- [ ] View verification badges
- [ ] Receive approval/rejection notifications

### Admin Dashboard

- [ ] View all pending documents
- [ ] Preview uploaded documents
- [ ] Approve documents
- [ ] Reject with reason
- [ ] Search/filter by provider
- [ ] View statistics (pending/approved/rejected)

### Public Display

- [ ] Trust badges on provider profiles
- [ ] Trust level display (Unverified→Elite)
- [ ] Verification checkmarks
- [ ] Score breakdown with progress bar

## Feature 4: Enhanced Search Filters

### Saved Searches

- [ ] Save search with custom name
- [ ] View all saved searches
- [ ] Run saved search
- [ ] Toggle notifications per search
- [ ] Delete saved searches
- [ ] Track last run date and results count

### Price Alerts

- [ ] Create price alert for annonce
- [ ] Set target price
- [ ] View active/triggered/paused alerts
- [ ] Toggle alert on/off
- [ ] Receive notification when price reached
- [ ] View discount percentage
- [ ] Delete alerts

### Flexible Date Picker

- [ ] Select from 11 preset options (today, tomorrow, weekend, etc.)
- [ ] Visual feedback on selection
- [ ] Date range calculation
- [ ] Apply to search filters

### Search History & Recommendations

- [ ] View search history
- [ ] Clear all history
- [ ] Delete individual history items
- [ ] Repeat previous search
- [ ] View personalized recommendations
- [ ] Confidence scores on recommendations
- [ ] Reason display for suggestions
- [ ] Click recommendation to view annonce

## Cross-cutting Concerns

### Real-time Updates

- [ ] Calendar slot changes
- [ ] New bookings notifications
- [ ] Review notifications
- [ ] Price alert triggers
- [ ] Verification status updates

### Permissions & Security

- [ ] Admin-only verification dashboard access
- [ ] Provider-only management pages
- [ ] Client-only review submission
- [ ] RLS policies enforcement

### UI/UX

- [ ] Mobile responsive design
- [ ] Web responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Success/error alerts

### Database Integrity

- [ ] Prevent double bookings
- [ ] Cascade deletes
- [ ] Timestamp auto-updates
- [ ] Rating recalculation triggers
- [ ] Trust score calculation

---

# Phase 2 Testing Checklist

## Feature 5: Dynamic Pricing Tools

### Provider - Pricing Rules Management

- [ ] Create seasonal pricing rule with date range
- [ ] Create duration-based discount rule
- [ ] Create early bird discount rule
- [ ] Create last-minute deal rule
- [ ] Create day-of-week pricing rule
- [ ] Set rule priority (higher priority applies first)
- [ ] Toggle rule active/inactive
- [ ] Delete pricing rule with confirmation
- [ ] View all rules with stats (total/active/inactive)

### Provider - Price Simulator

- [ ] Select service for simulation
- [ ] Input booking date, time, and duration
- [ ] Run price simulation
- [ ] View base price vs adjusted price
- [ ] See list of applied rules with adjustments
- [ ] Verify percentage change calculation
- [ ] Test with multiple overlapping rules
- [ ] Verify rule priority affects outcome

### Provider - Seasonal Pricing

- [ ] Apply preset template (Summer/Winter/Spring/Fall)
- [ ] Create custom seasonal rule
- [ ] Set price multiplier (e.g., 1.3x = +30%)
- [ ] Set date range for seasonal pricing
- [ ] View active seasonal rules
- [ ] Toggle seasonal rule status
- [ ] Delete seasonal rule

### Price Calculation Logic

- [ ] Verify seasonal rules apply correctly to date ranges
- [ ] Test duration-based discounts (longer = cheaper)
- [ ] Test early bird discounts (advance booking)
- [ ] Test last-minute deals (urgent fills)
- [ ] Test day-of-week pricing (weekends vs weekdays)
- [ ] Verify rule priority ordering
- [ ] Test with conflicting rules (priority wins)
- [ ] Verify price multiplier calculations
- [ ] Test with no active rules (base price only)

---

## Feature 6: Provider Analytics Dashboard

### Provider - Dashboard Overview

- [ ] View analytics for daily period
- [ ] View analytics for weekly period
- [ ] View analytics for monthly period
- [ ] View analytics for yearly period
- [ ] Switch between periods smoothly
- [ ] See empty state when no data exists

### Revenue Metrics

- [ ] View total revenue for period
- [ ] View average booking value
- [ ] View cancellation revenue loss
- [ ] Verify revenue calculations accuracy

### Booking Metrics

- [ ] View total bookings count
- [ ] View confirmed bookings count
- [ ] View cancelled bookings count
- [ ] View completed bookings count
- [ ] Verify booking status counts

### Performance Metrics

- [ ] View response rate percentage with progress bar
- [ ] View acceptance rate percentage with progress bar
- [ ] View cancellation rate percentage with progress bar
- [ ] Verify percentage calculations

### Client Metrics

- [ ] View new clients count
- [ ] View repeat clients count
- [ ] Differentiate first-time vs returning

### Review Metrics

- [ ] View average rating (star display)
- [ ] View total reviews count
- [ ] Match with Review System data

### Top Services

- [ ] View top 5 services by earnings
- [ ] See bookings count per service
- [ ] See average price per service
- [ ] See total earnings per service
- [ ] Navigate to earnings report

### Analytics Updates

- [ ] Verify daily cron job updates data
- [ ] Test manual refresh/reload
- [ ] Check data consistency across periods

---

## Feature 7: Messaging Enhancements

### Conversations List

- [ ] View all conversations
- [ ] See unread indicator badge
- [ ] See unread count number
- [ ] View last message preview
- [ ] See timestamp (relative time format)
- [ ] Search conversations by name
- [ ] Navigate to chat conversation
- [ ] See empty state with no conversations

### Real-time Messaging

- [ ] Send message to provider
- [ ] Send message to client
- [ ] Receive message in real-time (no refresh)
- [ ] See "You:" prefix for sent messages
- [ ] Update last message preview instantly
- [ ] Update unread count in real-time
- [ ] Receive notification for new message

### Unread Tracking

- [ ] Increment unread count on new message
- [ ] Show unread indicator on avatar
- [ ] Decrement unread count when message read
- [ ] Highlight unread conversations
- [ ] Reset count to zero when opening chat

### Message Templates (Providers)

- [ ] Create message template
- [ ] Categorize template (greeting/pricing/etc)
- [ ] Use template in conversation
- [ ] Edit message template
- [ ] Delete message template
- [ ] Track template usage count

### File Attachments

- [ ] Attach photo to message
- [ ] Attach document to message
- [ ] View file size and type
- [ ] Download attachment
- [ ] Verify file upload to Supabase Storage
- [ ] Enforce file size limits

### Conversation Management

- [ ] Archive conversation (client side)
- [ ] Archive conversation (provider side)
- [ ] Unarchive conversation
- [ ] Filter archived conversations

---

## Feature 8: Flexible Cancellation Policies

### Provider - Policy Management

- [ ] View all cancellation policies
- [ ] Create policy from Flexible template
- [ ] Create policy from Moderate template
- [ ] Create policy from Strict template
- [ ] Set policy name and description
- [ ] Set as default policy
- [ ] Toggle policy active/inactive
- [ ] Delete policy with confirmation
- [ ] See empty state with no policies

### Policy Configuration

- [ ] Configure time-based refund rules
- [ ] Set refund percentage per time period
- [ ] Set cancellation fee (percentage)
- [ ] Set cancellation fee (fixed amount)
- [ ] Preview refund schedule before saving
- [ ] Verify refund rules in correct order

### Client - Cancel Booking

- [ ] View booking details before cancel
- [ ] Select cancellation reason
- [ ] See applicable cancellation policy
- [ ] View refund amount calculation
- [ ] See hours until booking start
- [ ] View refund percentage based on timing
- [ ] Submit cancellation request
- [ ] Receive cancellation confirmation

### Refund Calculator

- [ ] Calculate refund for 7+ days before
- [ ] Calculate refund for 2-7 days before
- [ ] Calculate refund for 24-48 hours before
- [ ] Calculate refund for <24 hours before
- [ ] Apply cancellation fees correctly
- [ ] Show refund breakdown (base - fee = final)
- [ ] Handle edge cases (0% refund, 100% refund)

### Cancellation Request Tracking

- [ ] Provider views cancellation requests
- [ ] Client views cancellation request status
- [ ] See request status (pending/approved/rejected)
- [ ] Track refund processing
- [ ] See refund completion timestamp
- [ ] Admin review disputed cancellations

### Policy Logic Testing

- [ ] Flexible policy: 24h = 100%, <24h = 50%
- [ ] Moderate policy: 48h = 100%, 24-48h = 50%, <24h = 0%
- [ ] Strict policy: 7d = 100%, 2-7d = 50%, <48h = 0%
- [ ] Custom policy with unique rules
- [ ] Apply cancellation fees correctly
- [ ] Handle bookings with no policy (default)

---

## Cross-cutting Concerns - Phase 2

### Database & RLS

- [ ] All Phase 2 tables have RLS enabled
- [ ] Pricing rules: Only owner can edit
- [ ] Analytics: Only owner can view
- [ ] Messages: Only participants can view/send
- [ ] Policies: Owner can edit, clients can view active
- [ ] Cancellation requests: Participants can view
- [ ] Test unauthorized access attempts

### Real-time Functionality

- [ ] Messages deliver in real-time
- [ ] Conversation list updates live
- [ ] Unread counts update instantly
- [ ] Price changes reflect immediately
- [ ] Analytics refresh on period change

### Performance

- [ ] Pricing rule priority sorting is fast
- [ ] Analytics queries with large datasets
- [ ] Message list with 100+ conversations
- [ ] Price simulator with 10+ rules
- [ ] Pagination on long lists

### Error Handling

- [ ] Invalid date ranges in pricing rules
- [ ] Invalid price multipliers (<0 or extreme values)
- [ ] Network errors during message send
- [ ] Failed file uploads
- [ ] Invalid refund calculations
- [ ] Duplicate default policies

### Mobile Responsiveness

- [ ] Pricing rules cards on small screens
- [ ] Analytics dashboard on tablets
- [ ] Message bubbles on various screen sizes
- [ ] Date pickers work correctly
- [ ] Touch targets minimum 44x44 pixels

### Accessibility

- [ ] Screen reader support for analytics
- [ ] Color contrast on pricing cards
- [ ] Form labels for pricing inputs
- [ ] Alt text for policy templates
- [ ] Keyboard navigation in messages

---

## Integration Testing - Phase 2

### Pricing + Bookings

- [ ] Dynamic price applied to new booking
- [ ] Booking price locked when confirmed
- [ ] Price history tracked on change
- [ ] Seasonal rules active during booking

### Analytics + All Features

- [ ] Analytics update after new booking
- [ ] Analytics track cancellations
- [ ] Revenue reflects completed bookings
- [ ] Response rate tracks message replies

### Messaging + Bookings

- [ ] Message thread for each booking
- [ ] Booking confirmation sent as message
- [ ] Cancellation notification in messages
- [ ] Automated messages for reminders

### Cancellation + Payments

- [ ] Refund amount matches policy
- [ ] Payment reversal processes correctly
- [ ] Provider balance updated
- [ ] Client receives refund confirmation

---

## End-to-End Workflows - Phase 2

### Provider Optimization Workflow

1. [ ] Provider creates seasonal pricing rule
2. [ ] Provider tests with price simulator
3. [ ] Provider adjusts multiplier based on simulation
4. [ ] Provider activates rule
5. [ ] Client books with dynamic price
6. [ ] Provider views earnings in analytics
7. [ ] Provider optimizes based on analytics

### Client Cancellation Workflow

1. [ ] Client views booking
2. [ ] Client initiates cancellation
3. [ ] System shows applicable policy
4. [ ] Client sees refund calculation
5. [ ] Client confirms cancellation
6. [ ] Provider receives notification
7. [ ] Refund processes automatically
8. [ ] Both parties receive confirmation

### Messaging Workflow

1. [ ] Client finds provider
2. [ ] Client sends inquiry message
3. [ ] Provider receives real-time notification
4. [ ] Provider responds with template
5. [ ] Conversation continues
6. [ ] Booking confirmed via message
7. [ ] Post-booking follow-up messages

---

**Testing Progress:** Phase 2 - 0 of 150+ test cases complete  
**Next Priority:** Begin testing dynamic pricing and analytics features
