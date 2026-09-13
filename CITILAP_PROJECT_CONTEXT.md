# CITILAP --- PROJECT CONTEXT

## 1. Project Overview

Citilap is an e-commerce platform focused primarily on laptops,
computers, components, monitors and accessories.

The website should have the look and shopping experience of modern
Vietnamese e-commerce laptop stores, using the following sites as
visual/functional references:

-   https://thegioiso365.vn/
-   https://laptopnew.vn/

Important: these websites are references only. Citilap should have its
own design system, business logic and data architecture.

## 2. Core Product Goal

Build Citilap as a scalable e-commerce platform, not merely a simple
product listing website.

The system must be designed from the beginning so that it can later
support:

-   Customer website
-   Admin dashboard
-   Mobile application
-   POS/store sales
-   Multiple warehouses
-   ERP/WMS integration
-   CRM
-   Payment providers
-   Shipping providers
-   Marketplace integrations
-   Partner APIs
-   Advanced analytics
-   AI/search/recommendation features

The first release can be a modular monolith, but the domain boundaries
and APIs must allow future extraction into independent services.

## 3. Architecture Principles

### API-first

Frontend must communicate with the backend through APIs.

Do not place important business logic only in the frontend.

Target structure:

Customer / Admin / Mobile / POS \| v API \| +-- Auth +-- Product +--
Category +-- Inventory +-- Order +-- Customer +-- Payment +-- Shipping
+-- Promotion +-- Content +-- Notification +-- Reporting \| v PostgreSQL
/ Redis / Object Storage

### Modular architecture

Recommended backend modules:

-   auth
-   users
-   customers
-   products
-   categories
-   brands
-   inventory
-   orders
-   payments
-   shipping
-   promotions
-   content
-   reviews
-   notifications
-   analytics
-   reports
-   integrations

Do not create a tightly coupled application where every feature depends
directly on every other feature.

## 4. Recommended Technology Stack

### Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   shadcn/ui or a custom design system
-   Zod
-   React Hook Form

Use SSR/SSG/ISR appropriately for SEO and performance.

### Backend

Preferred:

-   Node.js
-   TypeScript
-   NestJS or Fastify
-   REST API
-   OpenAPI / Swagger

### Database

-   PostgreSQL

### Cache

-   Redis

Use Redis for caching, rate limiting, sessions where appropriate,
temporary data and queues.

### Storage

Use object storage rather than local server storage.

Possible providers:

-   S3
-   Cloudflare R2
-   Supabase Storage

Use CDN for public media.

### Infrastructure

Possible:

-   Vercel for frontend
-   Managed PostgreSQL
-   Managed Redis
-   Cloudflare CDN/WAF
-   GitHub + GitHub Actions
-   Sentry / monitoring

The architecture must not depend on a specific provider.

## 5. Main Website Features

### Homepage

-   Header
-   Logo
-   Category navigation
-   Search
-   Cart
-   Account
-   Banners
-   Featured products
-   New products
-   Gaming laptops
-   Office laptops
-   Like New products
-   Sale products
-   Best sellers
-   Blog
-   Policies
-   Footer

### Product listing

Support:

-   Category
-   Brand
-   Price
-   CPU
-   GPU
-   RAM
-   SSD
-   Display size
-   Resolution
-   Refresh rate
-   Product condition
-   Other configurable attributes

Sorting:

-   Newest
-   Price low to high
-   Price high to low
-   Best selling
-   Featured

### Product detail

Must include:

-   Product name
-   SKU
-   Price
-   Old price
-   Discount
-   Stock status
-   Product condition
-   Image gallery
-   Video
-   Description
-   Specifications
-   Warranty
-   Included accessories
-   Shipping information
-   Payment information
-   Reviews
-   Related products
-   Buy now
-   Add to cart
-   Contact

## 6. Product Data Model

Do not model a product as only:

Product name + price + image + description.

Use:

Product -\> Variant -\> SKU -\> Serial -\> Price -\> Cost -\> Inventory
-\> Configuration -\> Images -\> Attributes -\> Specifications -\>
Warranty -\> SEO

This is especially important for used/like-new laptops where individual
physical units may have different serial numbers, condition, cost and
repair history.

## 7. Laptop Specifications

The product specification system must be extensible.

Possible fields:

### CPU

-   Manufacturer
-   Model
-   Generation
-   Cores
-   Threads
-   Base clock
-   Turbo clock

### GPU

-   Model
-   VRAM
-   TGP
-   Integrated/dedicated

### RAM

-   Capacity
-   Type
-   Bus
-   Number of slots
-   Upgradeability

### Storage

-   Capacity
-   SSD/HDD
-   NVMe/SATA
-   Number of slots
-   Upgradeability

### Display

-   Size
-   Resolution
-   Panel
-   Refresh rate
-   Brightness
-   Color gamut
-   Touch

### Other

-   WiFi
-   Bluetooth
-   USB
-   Thunderbolt
-   HDMI
-   LAN
-   Webcam
-   Keyboard
-   Battery
-   Weight
-   Dimensions

The specification engine should allow administrators to create new
attributes without requiring a database redesign for every new
specification.

## 8. Product Conditions

Support configurable conditions such as:

-   NEW
-   LIKE_NEW
-   USED
-   REFURBISHED
-   REPAIRED
-   LIQUIDATION
-   DAMAGED

For used/like-new products, optionally track:

-   Cosmetic condition
-   Scratches
-   Battery health
-   Battery cycle count
-   Screen condition
-   Keyboard condition
-   Hinge condition
-   Mainboard condition
-   CPU/GPU condition
-   Included accessories
-   Repair history

## 9. Serial Number Management

Physical laptop units must support serial tracking.

Each serial should be associated with:

-   Product / SKU
-   Serial number
-   IMEI if applicable
-   Condition
-   Purchase date
-   Cost
-   Selling price
-   Warehouse
-   Supplier
-   Warranty
-   Repair history
-   Order history

A sold unit must remain traceable historically.

## 10. Inventory

Support multiple warehouses from the beginning.

Examples:

-   Hanoi warehouse
-   HCMC warehouse
-   Central warehouse
-   Warranty/repair warehouse
-   Damaged goods warehouse

Inventory must support:

-   Available
-   Reserved
-   Sold
-   In transit
-   Damaged
-   Repair
-   Transfer

### Inventory transaction model

Every inventory change must create a transaction.

Examples:

-   IMPORT
-   SALE
-   RETURN
-   TRANSFER
-   ADJUSTMENT
-   REPAIR
-   DAMAGED
-   RESERVED
-   RELEASED

Store:

-   Before quantity
-   Change quantity
-   After quantity
-   Reason
-   User
-   Timestamp
-   Reference

Never silently modify stock without history.

## 11. Inventory Concurrency

Critical requirement:

If only one physical laptop remains, two customers must not be able to
successfully purchase it.

Use:

-   Database transactions
-   Atomic stock operations
-   Stock reservation
-   Reservation expiry

Suggested flow:

AVAILABLE -\> RESERVED -\> PAID -\> SOLD

If checkout expires:

RESERVED -\> RELEASED

## 12. Cart and Checkout

Cart:

-   Add
-   Remove
-   Change quantity
-   Validate stock
-   Apply coupon
-   Calculate shipping
-   Calculate totals

Checkout:

1.  Customer information
2.  Address
3.  Shipping method
4.  Payment method
5.  Order review
6.  Confirmation

The server must calculate final price and stock availability. Never
trust price or inventory values supplied by the browser.

## 13. Orders

Order states:

-   PENDING
-   CONFIRMED
-   PROCESSING
-   PACKING
-   SHIPPING
-   DELIVERED
-   COMPLETED
-   CANCELLED
-   RETURNED
-   REFUNDED

Admin must be able to:

-   Search orders
-   Filter orders
-   Confirm
-   Cancel
-   Assign warehouse
-   Assign staff
-   Assign shipping provider
-   Update tracking
-   Print order documents
-   Refund
-   Add internal notes

### Order history

Orders must preserve a timeline:

Created -\> Confirmed -\> Packed -\> Shipped -\> Delivered -\> Completed

Do not overwrite historical state changes.

### Order snapshot

Order items must snapshot:

-   Product name
-   SKU
-   Serial
-   Unit price
-   Discount
-   Final price

Changing a product later must not change historical orders.

## 14. Idempotency

Important operations must support idempotency:

-   Create order
-   Payment
-   Refund
-   Shipment

Example:

POST /api/v1/orders Idempotency-Key: unique-key

Retrying the same request must not create duplicate orders/payments.

## 15. Payment Architecture

Do not hard-code one payment provider into the order system.

Use a PaymentProvider abstraction.

Possible providers:

-   COD
-   Bank transfer
-   VNPay
-   MoMo
-   ZaloPay
-   Future providers

Payment states:

-   PENDING
-   AUTHORIZED
-   PAID
-   FAILED
-   REFUNDED
-   CANCELLED

Store:

-   Payment ID
-   Order ID
-   Provider
-   Amount
-   Currency
-   Status
-   Transaction ID
-   Created timestamp
-   Updated timestamp

## 16. Shipping Architecture

Use a ShippingProvider abstraction.

Possible:

-   GHN
-   GHTK
-   Viettel Post
-   J&T
-   Future providers

Operations:

-   Calculate shipping fee
-   Create shipment
-   Cancel shipment
-   Track shipment

## 17. Customer Accounts

Customer features:

-   Registration
-   Login
-   Password reset
-   OTP
-   Google login
-   Profile
-   Addresses
-   Order history
-   Wishlist
-   Reviews
-   Coupons

Customer tagging should support future CRM:

-   VIP
-   Wholesale
-   Retail
-   Partner
-   Gaming
-   Returning customer
-   High value

## 18. Search

Search is a core feature.

Search by:

-   Product name
-   Model
-   SKU
-   Brand
-   CPU
-   GPU

Must support:

-   Autocomplete
-   Suggestions
-   Search history
-   Popular searches
-   SKU search
-   Typo tolerance where possible

Start with PostgreSQL search if scale is small.

Possible future search engine:

-   Meilisearch
-   OpenSearch
-   Elasticsearch

## 19. Admin Dashboard

Admin dashboard should show:

### Sales

-   Today
-   Yesterday
-   7 days
-   30 days
-   Month
-   Year

### Orders

-   New
-   Pending confirmation
-   Processing
-   Shipping
-   Delivered
-   Cancelled

### Products

-   Best sellers
-   Low stock
-   Out of stock
-   New products

### Customers

-   New customers
-   Returning customers
-   Total customers

## 20. Admin Product Management

Admin features:

-   Create product
-   Edit product
-   Delete/archive product
-   Draft
-   Publish
-   Unpublish
-   Duplicate product
-   Import
-   Export
-   Bulk edit
-   Bulk publish
-   Bulk price update
-   Bulk category update

Product status:

-   DRAFT
-   ACTIVE
-   INACTIVE
-   OUT_OF_STOCK
-   ARCHIVED

## 21. CMS / Blog

Admin can:

-   Create article
-   Edit article
-   Draft
-   Publish
-   Schedule
-   Categories
-   Tags
-   Author
-   Thumbnail
-   SEO title
-   SEO description
-   Slug

Editor should support:

-   Headings
-   Text
-   Images
-   Video
-   Tables
-   Links
-   Quotes
-   Product embedding
-   FAQ

## 22. Homepage / Page Builder

Use configurable blocks:

-   Hero banner
-   Product slider
-   Product grid
-   Category grid
-   Banner
-   Text
-   Image
-   Video
-   Blog
-   FAQ
-   Promotion

Admin should be able to change order/content without developer code
changes.

## 23. Banner Management

Support:

-   Desktop image
-   Mobile image
-   Link
-   Start date
-   End date
-   Priority
-   Active/inactive
-   Placement

## 24. Promotion Engine

Support:

-   Percentage discount
-   Fixed amount discount
-   Coupons
-   Minimum order value
-   Product-specific promotions
-   Category-specific promotions
-   Brand-specific promotions
-   Customer-specific promotions
-   Date range
-   Usage limits

Future:

-   Buy X Get Y
-   Combo
-   Flash Sale
-   Member pricing
-   Tier pricing

## 25. Reviews

Customer can submit:

-   Rating 1--5
-   Text
-   Images
-   Video

Admin can:

-   Approve
-   Hide
-   Delete
-   Reply

## 26. Wishlist

Customer can:

-   Add product
-   Remove product
-   View wishlist

Future:

-   Price drop notification
-   Back-in-stock notification

## 27. SEO

Every public entity should support:

-   Product
-   Category
-   Brand
-   Blog
-   Page

SEO fields:

-   Slug
-   Meta title
-   Meta description
-   Canonical URL
-   OG title
-   OG description
-   OG image

System should support:

-   Sitemap
-   Robots.txt
-   Product structured data
-   Breadcrumb structured data
-   Article structured data
-   Organization structured data

When a slug changes, automatically create a 301 redirect.

## 28. Media

Do not store production images on application server filesystem.

Use:

Object Storage -\> CDN -\> Website

Support:

-   WebP/AVIF
-   Responsive image sizes
-   Thumbnail
-   Compression
-   Lazy loading
-   CDN caching

## 29. Authentication and Authorization

Authentication:

-   Email/password
-   Phone/OTP
-   Google login
-   Admin login

Admin security:

-   2FA
-   Session management
-   Login history
-   Logout all sessions

## 30. RBAC

Roles should include:

-   Super Admin
-   Admin
-   Manager
-   Product Manager
-   Order Manager
-   Warehouse
-   Customer Support
-   Content Editor
-   Marketing
-   Accountant

Permissions should be granular:

product.read product.create product.update product.delete

order.read order.update order.cancel

inventory.read inventory.update

customer.read customer.update

content.create content.publish

Do not rely only on frontend permission checks.

## 31. Audit Logs

Important administrative actions must be logged.

Store:

-   User
-   Action
-   Resource
-   Resource ID
-   Before
-   After
-   IP
-   User agent
-   Timestamp

Examples:

-   Product price changed
-   Product deleted
-   Stock adjusted
-   Order cancelled
-   Refund performed
-   Permission changed
-   Article published

## 32. API

Use versioned API:

/api/v1

Examples:

GET /api/v1/products GET /api/v1/products/:id POST /api/v1/products
PATCH /api/v1/products/:id DELETE /api/v1/products/:id

GET /api/v1/categories GET /api/v1/orders POST /api/v1/orders

POST /api/v1/auth/login POST /api/v1/auth/logout

Future breaking changes can use /api/v2.

## 33. API Response Standard

Success:

{ "success": true, "data": {}, "meta": {} }

Error:

{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message":
"Product not found", "details": {} } }

All modules should use consistent response/error conventions.

## 34. Pagination

Do not return entire tables.

Initial:

?page=1&limit=20

For very large datasets, use cursor pagination.

## 35. Security

Baseline security requirements:

-   HTTPS
-   Password hashing
-   Secure authentication
-   Rate limiting
-   CORS policy
-   CSRF protection where applicable
-   Input validation
-   Output encoding
-   SQL injection protection
-   XSS protection
-   File upload validation
-   File size limits
-   MIME validation
-   Authorization
-   RBAC
-   Admin 2FA
-   Brute-force protection
-   Audit logging
-   Secure secret management

Follow OWASP principles for web and API security.

## 36. Performance

Target:

-   LCP under 2.5 seconds for important pages under normal conditions
-   Typical API P95 under 500 ms where practical
-   CDN for static media
-   Optimized images
-   Lazy loading
-   Avoid N+1 queries
-   Proper database indexes
-   Query monitoring
-   Cache appropriate read-heavy data

## 37. Scalability

Backend should be stateless where possible.

Target evolution:

Single API instance -\> Multiple API instances -\> Load balancer -\>
Redis -\> Queue/workers -\> Read replicas -\> Independent services if
necessary

Do not introduce microservices prematurely.

Start with a modular monolith and clear domain boundaries.

## 38. Async Jobs

Use queues/workers for:

-   Email
-   Notifications
-   Image processing
-   Excel import/export
-   Invoice generation
-   Shipping synchronization
-   Inventory synchronization
-   Report generation
-   Other long-running tasks

Do not block normal HTTP requests with expensive jobs.

## 39. Scheduled Jobs

Prepare scheduled jobs for:

-   Releasing expired stock reservations
-   Updating product status
-   Shipping synchronization
-   Sitemap generation
-   Expiring promotions
-   Abandoned cart processing
-   Other periodic maintenance

## 40. Multi-Warehouse

Database must support:

Warehouse Inventory Inventory Location Stock Transfer

Stock transfer lifecycle:

REQUESTED -\> APPROVED -\> SHIPPING -\> RECEIVED

## 41. Multi-Channel

The core backend should support:

-   Website
-   Mobile App
-   POS
-   Facebook/social sales
-   TikTok Shop
-   Shopee
-   Partner API

Products, inventory, orders, customers and pricing should have a shared
source of truth.

## 42. Reporting

Reports:

### Sales

-   Revenue
-   Orders
-   Average order value
-   Best sellers

### Inventory

-   Current stock
-   Low stock
-   Out of stock
-   Aging stock
-   Stock movement

### Profit

-   Revenue
-   Cost
-   Discount
-   Shipping cost
-   Payment fees
-   Gross profit

### Customer

-   New customers
-   Repeat customers
-   Customer lifetime value

## 43. Analytics

Possible integrations:

-   Google Analytics
-   Google Search Console
-   Meta Pixel
-   Google Ads

Standard events:

-   view_item
-   search
-   add_to_cart
-   begin_checkout
-   purchase
-   refund

Analytics calls should go through an abstraction layer rather than being
hard-coded throughout the UI.

## 44. Database Requirements

Core tables should include at minimum:

users roles permissions

products product_variants product_images product_attributes
product_specs

categories brands collections

inventory inventory_locations inventory_transactions

orders order_items order_status_history

customers customer_addresses

payments payment_transactions

shipments shipping_transactions

promotions coupons

posts pages banners

reviews questions

notifications

audit_logs

Use migrations for all schema changes.

Never manually change production database structure.

## 45. Data Integrity

Important principles:

-   Orders must preserve historical data.
-   Product changes must not alter old order information.
-   Price must be snapshotted into order items.
-   Serial history must remain traceable.
-   Inventory changes must be transactional.
-   Payment operations must be idempotent.
-   Stock reservation must be concurrency-safe.
-   Deleting important business records should usually be
    soft-delete/archive rather than physical deletion.

## 46. Environments

At minimum:

-   Development
-   Staging
-   Production

CI/CD flow:

GitHub -\> Pull Request -\> Lint -\> Type check -\> Tests -\> Build -\>
Staging -\> Approval -\> Production

Developers should not test experimental code directly on production.

## 47. Testing

### Unit tests

Test:

-   Pricing
-   Promotion
-   Order calculations
-   Inventory
-   Payment logic

### Integration tests

Test:

Create order -\> Reserve stock -\> Payment -\> Confirm -\> Shipment

### E2E

Test:

Search -\> Product -\> Cart -\> Checkout -\> Payment

Admin:

Create product -\> Publish -\> Verify on website

## 48. API Documentation

All APIs must be documented using OpenAPI/Swagger.

Each endpoint should define:

-   Request
-   Response
-   Authentication
-   Authorization
-   Parameters
-   Errors
-   Example

## 49. Feature Flags

Support feature flags for controlled releases.

Examples:

FEATURE_NEW_CHECKOUT FEATURE_WISHLIST FEATURE_FLASH_SALE

Feature flags should be configurable without changing application code.

## 50. Configuration

Business configuration should be stored in configuration
management/admin settings, not hard-coded.

Examples:

-   Website name
-   Hotline
-   Email
-   Social links
-   Order prefix
-   VAT settings
-   Shipping settings
-   Payment settings

Secrets must be stored in secure environment/secret management.

## 51. Internationalization

Prepare architecture for:

-   vi-VN
-   en-US
-   zh-CN

Initial release can use Vietnamese only.

## 52. Currency

Prepare architecture for:

-   VND
-   USD
-   CNY

Initial release can use VND only.

## 53. Suggested Domains

citilap.vn www.citilap.vn api.citilap.vn admin.citilap.vn cdn.citilap.vn

Potential future:

app.citilap.vn pos.citilap.vn

## 54. Suggested Repository Structure

Possible monorepo:

apps/ web/ admin/ api/

packages/ ui/ types/ api-client/ database/ auth/ payments/ shipping/
notifications/ config/ utils/

Backend domain modules:

modules/ auth/ users/ customers/ products/ categories/ brands/
inventory/ orders/ payments/ shipping/ promotions/ content/ reviews/
notifications/ analytics/ reports/ integrations/

## 55. Future Event-Driven Architecture

Prepare domain events such as:

ProductCreated ProductUpdated StockChanged

OrderCreated OrderConfirmed OrderPaid OrderShipped OrderDelivered
OrderCancelled

PaymentSucceeded PaymentFailed

CustomerCreated

Initially events can use an internal event mechanism.

At larger scale, introduce:

-   RabbitMQ
-   Kafka
-   SQS
-   Other managed queues

## 56. Future Features

Potential future development:

-   Mobile app
-   POS
-   ERP integration
-   WMS
-   CRM
-   Loyalty
-   Membership
-   Flash sale
-   Product comparison
-   AI search
-   AI customer support
-   Product recommendation
-   Marketplace synchronization
-   Advanced warehouse management
-   Advanced analytics

## 57. MVP Priority

### Phase 1

Customer:

-   Homepage
-   Category
-   Product listing
-   Product detail
-   Search
-   Cart
-   Checkout
-   Account
-   Order tracking

Admin:

-   Authentication
-   Dashboard
-   Product
-   Category
-   Brand
-   Inventory
-   Orders
-   Customers
-   Banner
-   Blog
-   RBAC

Backend:

-   Auth API
-   Product API
-   Category API
-   Order API
-   Customer API
-   Inventory API
-   Content API
-   Payment abstraction
-   Shipping abstraction

Infrastructure:

-   PostgreSQL
-   Redis
-   Object storage
-   CDN
-   CI/CD
-   Monitoring
-   Backup

### Phase 2

-   Coupons
-   Promotion engine
-   Wishlist
-   Reviews
-   Product comparison
-   Advanced search
-   Analytics
-   Customer segmentation
-   Excel import/export
-   Multi-warehouse
-   Shipping integration
-   Payment gateway
-   Notifications

### Phase 3

-   Mobile
-   POS
-   ERP
-   CRM
-   Marketplace integrations
-   Advanced warehouse
-   Loyalty
-   AI features

## 58. Definition of Done

A feature is not complete merely because the UI works.

A feature is complete when appropriate parts of the following are
implemented:

Database -\> Backend -\> API -\> Frontend -\> Admin -\> Validation -\>
Authorization -\> Error handling -\> Loading/empty states -\> Responsive
behavior -\> SEO where applicable -\> Tests -\> Logging -\>
Documentation

## 59. Critical Rules

1.  API-first.
2.  Frontend must not be the source of truth for price or stock.
3.  Product must support variants/SKU/serial.
4.  Inventory must be transaction-based.
5.  Orders must preserve historical snapshots.
6.  Payment and shipping must use provider abstractions.
7.  Admin must use RBAC.
8.  Media must use object storage/CDN.
9.  Backend should be stateless.
10. Important asynchronous tasks should use queues.
11. Database changes must use migrations.
12. Production secrets must never be committed to Git.
13. Public pages must be SEO-friendly.
14. Architecture must support horizontal scaling.
15. Avoid premature microservices; use a modular monolith first.
16. Every important business action should be auditable.
17. APIs must be versioned.
18. Critical write operations should be idempotent.
19. Inventory operations must be concurrency-safe.
20. The core domain should remain provider-independent.

## 60. Primary Development Philosophy

Citilap should be developed as a platform with a website as its first
client.

Do not build:

"Website first, backend later."

Build:

"Core domain + database + API + admin + website"

The first version should be simple enough to launch quickly, but its
data model, APIs, authorization, inventory, order and integration
boundaries must be strong enough to support significant future growth.
