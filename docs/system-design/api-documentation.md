# Inventory Management System API Documentation

## Overview
This document describes the RESTful API endpoints for the Comprehensive Inventory Management System. The API follows REST principles and returns JSON responses.

## Base URL
```
Production: https://api.inventory.company.com/v1
Staging: https://staging-api.inventory.company.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication
All API endpoints require authentication using JWT tokens.

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Login Endpoint
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "WAREHOUSE_STAFF",
      "distributionCenterId": "uuid"
    },
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

## Error Handling
All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "quantity",
        "message": "Quantity must be greater than 0"
      }
    ]
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Pagination
List endpoints support pagination:

```http
GET /items?page=1&limit=50&sort=name&order=asc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1247,
      "pages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## API Endpoints

### Items Management

#### List Items
```http
GET /items
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 50, max: 100)
- `search` (string): Search in name, SKU, or description
- `categoryId` (uuid): Filter by category
- `supplierId` (uuid): Filter by supplier
- `isActive` (boolean): Filter by active status
- `sort` (string): Sort field (name, sku, createdAt)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "sku": "WIDGET-001",
        "name": "Premium Widget",
        "description": "High-quality widget for industrial use",
        "category": {
          "id": "uuid",
          "name": "Widgets",
          "code": "WDG"
        },
        "unitOfMeasure": "EA",
        "unitCost": 25.50,
        "supplier": {
          "id": "uuid",
          "name": "Widget Corp",
          "code": "WC001"
        },
        "reorderPoint": 100,
        "maxStockLevel": 1000,
        "minStockLevel": 50,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1247,
      "pages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Item by ID
```http
GET /items/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "WIDGET-001",
    "name": "Premium Widget",
    "description": "High-quality widget for industrial use",
    "category": {
      "id": "uuid",
      "name": "Widgets",
      "code": "WDG",
      "path": "Industrial/Widgets"
    },
    "unitOfMeasure": "EA",
    "unitCost": 25.50,
    "weightKg": 0.5,
    "dimensionsCm": "10x5x2",
    "barcode": "1234567890123",
    "supplier": {
      "id": "uuid",
      "name": "Widget Corp",
      "code": "WC001",
      "contactPerson": "John Smith",
      "email": "john@widgetcorp.com"
    },
    "reorderPoint": 100,
    "maxStockLevel": 1000,
    "minStockLevel": 50,
    "leadTimeDays": 14,
    "shelfLifeDays": null,
    "isSerialized": false,
    "isActive": true,
    "stockLevels": [
      {
        "distributionCenterId": "uuid",
        "distributionCenterName": "Main Warehouse",
        "quantityAvailable": 250,
        "quantityReserved": 50,
        "quantityDamaged": 5,
        "quantityInRepair": 2,
        "lastCountedAt": "2024-01-10T14:00:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Item
```http
POST /items
Content-Type: application/json

{
  "sku": "WIDGET-002",
  "name": "Standard Widget",
  "description": "Standard quality widget",
  "categoryId": "uuid",
  "unitOfMeasure": "EA",
  "unitCost": 15.75,
  "weightKg": 0.3,
  "dimensionsCm": "8x4x2",
  "barcode": "1234567890124",
  "supplierId": "uuid",
  "reorderPoint": 75,
  "maxStockLevel": 500,
  "minStockLevel": 25,
  "leadTimeDays": 10,
  "isSerialized": false
}
```

#### Update Item
```http
PUT /items/{id}
Content-Type: application/json

{
  "name": "Updated Widget Name",
  "unitCost": 16.00,
  "reorderPoint": 80
}
```

#### Delete Item
```http
DELETE /items/{id}
```

### Inventory Stock Management

#### Get Stock Levels
```http
GET /inventory/stock
```

**Query Parameters:**
- `distributionCenterId` (uuid): Filter by distribution center
- `itemId` (uuid): Filter by specific item
- `stockStatus` (string): Filter by status (NORMAL, LOW_STOCK, OUT_OF_STOCK, OVERSTOCK)
- `categoryId` (uuid): Filter by item category
- `page`, `limit`, `sort`, `order`: Standard pagination parameters

**Response:**
```json
{
  "success": true,
  "data": {
    "stockLevels": [
      {
        "id": "uuid",
        "item": {
          "id": "uuid",
          "sku": "WIDGET-001",
          "name": "Premium Widget",
          "reorderPoint": 100,
          "maxStockLevel": 1000,
          "minStockLevel": 50
        },
        "distributionCenter": {
          "id": "uuid",
          "name": "Main Warehouse",
          "code": "MW001"
        },
        "storageLocation": {
          "id": "uuid",
          "locationCode": "A1-B2-S3",
          "zone": "A1",
          "aisle": "B2",
          "shelf": "S3"
        },
        "quantityAvailable": 250,
        "quantityReserved": 50,
        "quantityDamaged": 5,
        "quantityInRepair": 2,
        "quantityOnOrder": 100,
        "stockStatus": "NORMAL",
        "stockPercentage": 25.0,
        "costPerUnit": 25.50,
        "totalValue": 6375.00,
        "lastCountedAt": "2024-01-10T14:00:00Z",
        "lastMovementAt": "2024-01-15T09:30:00Z"
      }
    ],
    "summary": {
      "totalItems": 1247,
      "totalValue": 125000.00,
      "lowStockItems": 23,
      "outOfStockItems": 8,
      "overstockItems": 12
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1247,
      "pages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Record Stock Movement
```http
POST /inventory/stock/movements
Content-Type: application/json

{
  "itemId": "uuid",
  "distributionCenterId": "uuid",
  "storageLocationId": "uuid",
  "movementType": "IN",
  "quantity": 100,
  "unitCost": 25.50,
  "referenceType": "PURCHASE_ORDER",
  "referenceId": "uuid",
  "batchNumber": "BATCH-2024-001",
  "expiryDate": "2025-01-15",
  "notes": "Received from supplier"
}
```

**Movement Types:**
- `IN` - Stock received
- `OUT` - Stock issued/sold
- `TRANSFER` - Transfer between locations
- `ADJUSTMENT` - Inventory adjustment
- `DAMAGE` - Mark as damaged
- `REPAIR` - Send for repair
- `RETURN` - Return from repair

#### Get Stock Movement History
```http
GET /inventory/stock/movements
```

**Query Parameters:**
- `itemId` (uuid): Filter by item
- `distributionCenterId` (uuid): Filter by distribution center
- `movementType` (string): Filter by movement type
- `dateFrom` (date): Start date filter
- `dateTo` (date): End date filter
- `referenceType` (string): Filter by reference type
- `referenceId` (uuid): Filter by reference ID

### Damage Reports

#### List Damage Reports
```http
GET /damage/reports
```

**Query Parameters:**
- `status` (string): Filter by status
- `distributionCenterId` (uuid): Filter by distribution center
- `itemId` (uuid): Filter by item
- `damageType` (string): Filter by damage type
- `severity` (string): Filter by severity
- `dateFrom` (date): Start date filter
- `dateTo` (date): End date filter

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "reportNumber": "DMG-2024-001",
        "item": {
          "id": "uuid",
          "sku": "WIDGET-001",
          "name": "Premium Widget"
        },
        "distributionCenter": {
          "id": "uuid",
          "name": "Main Warehouse"
        },
        "quantityDamaged": 5,
        "damageType": "PHYSICAL",
        "damageSeverity": "MINOR",
        "rootCause": "Forklift accident",
        "description": "Items damaged during handling",
        "estimatedLossValue": 127.50,
        "actualLossValue": null,
        "photos": [
          "https://storage.company.com/damage-photos/photo1.jpg"
        ],
        "insuranceClaimNumber": "INS-2024-001",
        "reportedBy": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "reportedAt": "2024-01-15T10:30:00Z",
        "status": "APPROVED",
        "reviewedBy": {
          "id": "uuid",
          "firstName": "Jane",
          "lastName": "Manager"
        },
        "reviewedAt": "2024-01-15T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 45,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### Create Damage Report
```http
POST /damage/reports
Content-Type: multipart/form-data

{
  "itemId": "uuid",
  "distributionCenterId": "uuid",
  "storageLocationId": "uuid",
  "quantityDamaged": 5,
  "damageType": "PHYSICAL",
  "damageSeverity": "MINOR",
  "rootCause": "Forklift accident",
  "description": "Items damaged during handling",
  "estimatedLossValue": 127.50,
  "photos": [file1, file2],
  "insuranceClaimNumber": "INS-2024-001"
}
```

#### Approve/Reject Damage Report
```http
PUT /damage/reports/{id}/review
Content-Type: application/json

{
  "status": "APPROVED",
  "reviewNotes": "Approved for repair processing"
}
```

### Repair Orders

#### List Repair Orders
```http
GET /repairs/orders
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "repairOrderNumber": "REP-2024-001",
        "damageReport": {
          "id": "uuid",
          "reportNumber": "DMG-2024-001"
        },
        "item": {
          "id": "uuid",
          "sku": "WIDGET-001",
          "name": "Premium Widget"
        },
        "repairVendor": {
          "id": "uuid",
          "name": "Fix-It Corp",
          "specialization": ["Electronics", "Mechanical"]
        },
        "quantityToRepair": 5,
        "estimatedCost": 75.00,
        "actualCost": null,
        "estimatedCompletionDate": "2024-01-25",
        "actualCompletionDate": null,
        "repairDescription": "Replace damaged components",
        "status": "IN_PROGRESS",
        "priority": "MEDIUM",
        "warrantyPeriodDays": 90,
        "daysOverdue": 0,
        "createdAt": "2024-01-15T15:00:00Z",
        "updatedAt": "2024-01-15T15:00:00Z"
      }
    ],
    "summary": {
      "totalOrders": 15,
      "pendingOrders": 3,
      "inProgressOrders": 8,
      "completedOrders": 4,
      "overdueOrders": 2,
      "totalEstimatedCost": 1250.00,
      "totalActualCost": 800.00
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### Create Repair Order
```http
POST /repairs/orders
Content-Type: application/json

{
  "damageReportId": "uuid",
  "repairVendorId": "uuid",
  "quantityToRepair": 5,
  "estimatedCost": 75.00,
  "estimatedCompletionDate": "2024-01-25",
  "repairDescription": "Replace damaged components",
  "repairInstructions": "Handle with care, test thoroughly",
  "priority": "MEDIUM",
  "warrantyPeriodDays": 90
}
```

#### Update Repair Order Status
```http
PUT /repairs/orders/{id}/status
Content-Type: application/json

{
  "status": "COMPLETED",
  "actualCost": 68.50,
  "actualCompletionDate": "2024-01-24",
  "qualityCheckPassed": true,
  "notes": "Repair completed successfully, all items tested"
}
```

### Purchase Orders

#### List Purchase Orders
```http
GET /purchase-orders
```

#### Create Purchase Order
```http
POST /purchase-orders
Content-Type: application/json

{
  "supplierId": "uuid",
  "distributionCenterId": "uuid",
  "orderDate": "2024-01-15",
  "expectedDeliveryDate": "2024-01-25",
  "paymentTerms": 30,
  "priority": "NORMAL",
  "notes": "Rush order for low stock items",
  "items": [
    {
      "itemId": "uuid",
      "quantityOrdered": 100,
      "unitPrice": 25.50,
      "expectedDeliveryDate": "2024-01-25"
    }
  ]
}
```

### Expenses

#### List Expenses
```http
GET /expenses
```

**Query Parameters:**
- `expenseType` (string): Filter by expense type
- `distributionCenterId` (uuid): Filter by distribution center
- `supplierId` (uuid): Filter by supplier
- `paymentStatus` (string): Filter by payment status
- `dateFrom` (date): Start date filter
- `dateTo` (date): End date filter
- `category` (string): Filter by category

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "uuid",
        "expenseNumber": "EXP-2024-001",
        "expenseType": "INVENTORY_PURCHASE",
        "referenceType": "PURCHASE_ORDER",
        "referenceId": "uuid",
        "distributionCenter": {
          "id": "uuid",
          "name": "Main Warehouse"
        },
        "supplier": {
          "id": "uuid",
          "name": "Widget Corp"
        },
        "amount": 2550.00,
        "taxAmount": 255.00,
        "currency": "USD",
        "expenseDate": "2024-01-15",
        "dueDate": "2024-02-14",
        "description": "Purchase of premium widgets",
        "category": "Inventory",
        "paymentStatus": "PENDING",
        "invoiceNumber": "INV-2024-001",
        "invoiceDate": "2024-01-15",
        "approvalRequired": true,
        "approvedBy": null,
        "createdAt": "2024-01-15T16:00:00Z"
      }
    ],
    "summary": {
      "totalAmount": 125000.00,
      "pendingAmount": 25000.00,
      "paidAmount": 100000.00,
      "overdueAmount": 5000.00,
      "expensesByType": {
        "INVENTORY_PURCHASE": 100000.00,
        "REPAIR_COST": 15000.00,
        "DAMAGE_WRITEOFF": 10000.00
      }
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 234,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Alerts

#### Get Active Alerts
```http
GET /alerts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "alertType": "LOW_STOCK",
        "title": "Low Stock Alert: Premium Widget",
        "message": "Premium Widget (WIDGET-001) is running low. Current stock: 45 units (Reorder point: 100)",
        "severity": "HIGH",
        "item": {
          "id": "uuid",
          "sku": "WIDGET-001",
          "name": "Premium Widget"
        },
        "distributionCenter": {
          "id": "uuid",
          "name": "Main Warehouse"
        },
        "acknowledgedBy": null,
        "acknowledgedAt": null,
        "resolvedBy": null,
        "resolvedAt": null,
        "escalated": false,
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "summary": {
      "totalAlerts": 15,
      "criticalAlerts": 2,
      "highAlerts": 5,
      "mediumAlerts": 6,
      "lowAlerts": 2,
      "unacknowledgedAlerts": 8
    }
  }
}
```

#### Acknowledge Alert
```http
POST /alerts/{id}/acknowledge
Content-Type: application/json

{
  "notes": "Acknowledged, will reorder immediately"
}
```

#### Resolve Alert
```http
POST /alerts/{id}/resolve
Content-Type: application/json

{
  "resolutionNotes": "Stock replenished, alert resolved"
}
```

### Alert Configuration

#### Get Alert Configurations
```http
GET /alerts/config
```

#### Update Alert Configuration
```http
PUT /alerts/config/{id}
Content-Type: application/json

{
  "thresholdPercentage": 25,
  "notificationChannels": ["EMAIL", "SMS"],
  "emailRecipients": ["manager@company.com"],
  "smsRecipients": ["+1234567890"],
  "escalationEnabled": true,
  "escalationHours": 24,
  "businessHoursOnly": false,
  "maxAlertsPerDay": 5
}
```

### Reports

#### Generate Stock Report
```http
GET /reports/stock
```

**Query Parameters:**
- `distributionCenterId` (uuid): Filter by distribution center
- `categoryId` (uuid): Filter by category
- `format` (string): Response format (json, csv, pdf)
- `includeZeroStock` (boolean): Include out-of-stock items

#### Generate Expense Report
```http
GET /reports/expenses
```

**Query Parameters:**
- `dateFrom` (date): Start date
- `dateTo` (date): End date
- `distributionCenterId` (uuid): Filter by distribution center
- `expenseType` (string): Filter by expense type
- `format` (string): Response format (json, csv, pdf)
- `groupBy` (string): Group by field (category, supplier, month)

#### Generate Damage Report
```http
GET /reports/damage
```

#### Generate Repair Report
```http
GET /reports/repairs
```

### System Administration

#### Get System Health
```http
GET /system/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 5,
        "connections": 25
      },
      "redis": {
        "status": "healthy",
        "responseTime": 2,
        "memory": "45MB"
      },
      "email": {
        "status": "healthy",
        "lastSent": "2024-01-15T10:25:00Z"
      },
      "sms": {
        "status": "healthy",
        "lastSent": "2024-01-15T09:45:00Z"
      }
    }
  }
}
```

#### Get System Configuration
```http
GET /system/config
```

#### Update System Configuration
```http
PUT /system/config
Content-Type: application/json

{
  "lowStockThresholdPercentage": 20,
  "repairOverdueThresholdDays": 7,
  "maxFailedLoginAttempts": 5,
  "sessionTimeoutHours": 8
}
```

## WebSocket Events

The system supports real-time updates via WebSocket connections.

### Connection
```javascript
const ws = new WebSocket('wss://api.inventory.company.com/ws');
ws.send(JSON.stringify({
  type: 'authenticate',
  token: 'jwt_token_here'
}));
```

### Event Types
- `stock_updated` - Stock level changes
- `alert_created` - New alert generated
- `alert_acknowledged` - Alert acknowledged
- `damage_reported` - New damage report
- `repair_status_changed` - Repair order status update
- `expense_created` - New expense record

### Example Event
```json
{
  "type": "stock_updated",
  "data": {
    "itemId": "uuid",
    "distributionCenterId": "uuid",
    "oldQuantity": 50,
    "newQuantity": 45,
    "movementType": "OUT",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limiting
API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Read operations**: 1000 requests per hour per user
- **Write operations**: 500 requests per hour per user
- **File uploads**: 10 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## SDK Examples

### JavaScript/Node.js
```javascript
const InventoryAPI = require('@company/inventory-api-sdk');

const client = new InventoryAPI({
  baseURL: 'https://api.inventory.company.com/v1',
  apiKey: 'your-api-key'
});

// Get stock levels
const stockLevels = await client.inventory.getStockLevels({
  distributionCenterId: 'uuid',
  stockStatus: 'LOW_STOCK'
});

// Create damage report
const damageReport = await client.damage.createReport({
  itemId: 'uuid',
  distributionCenterId: 'uuid',
  quantityDamaged: 5,
  damageType: 'PHYSICAL',
  description: 'Damaged during handling'
});
```

### Python
```python
from inventory_api import InventoryClient

client = InventoryClient(
    base_url='https://api.inventory.company.com/v1',
    api_key='your-api-key'
)

# Get low stock items
low_stock = client.inventory.get_stock_levels(
    stock_status='LOW_STOCK',
    distribution_center_id='uuid'
)

# Record stock movement
movement = client.inventory.record_movement(
    item_id='uuid',
    distribution_center_id='uuid',
    movement_type='IN',
    quantity=100,
    unit_cost=25.50
)
```

This API documentation provides comprehensive coverage of all system endpoints with detailed request/response examples, authentication requirements, and usage guidelines for developers integrating with the inventory management system.