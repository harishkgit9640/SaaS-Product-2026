import { OpenAPIV3 } from "openapi-types";

const UUID_EXAMPLE = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/* ────────────────────────── reusable schemas ────────────────────────── */

const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  Error: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      error: {
        type: "object",
        properties: {
          message: { type: "string", example: "Descriptive error message" },
          requestId: { type: "string", example: "req_1711500000000_abcdefgh" },
          details: { type: "string", description: "Present only in non-production environments" },
        },
        required: ["message"],
      },
    },
    required: ["success", "error"],
  },

  Member: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid", example: UUID_EXAMPLE },
      fullName: { type: "string", example: "Rahul Sharma" },
      email: { type: "string", format: "email", example: "rahul@example.com" },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "fullName", "email", "status", "createdAt"],
  },

  CreateMemberInput: {
    type: "object",
    properties: {
      fullName: { type: "string", example: "Rahul Sharma" },
      email: { type: "string", format: "email", example: "rahul@example.com" },
      status: { type: "string", enum: ["active", "inactive"], default: "active" },
    },
    required: ["fullName", "email"],
  },

  UpdateMemberInput: {
    type: "object",
    properties: {
      fullName: { type: "string" },
      email: { type: "string", format: "email" },
      status: { type: "string", enum: ["active", "inactive"] },
    },
  },

  Plan: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Monthly Basic" },
      description: { type: "string", nullable: true, example: "Basic gym membership" },
      amountCents: { type: "integer", example: 99900, description: "Amount in paise (INR cents)" },
      billingCycle: { type: "string", enum: ["monthly", "yearly"], example: "monthly" },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "amountCents", "billingCycle", "status", "createdAt"],
  },

  CreatePlanInput: {
    type: "object",
    properties: {
      name: { type: "string", example: "Monthly Basic" },
      amountCents: { type: "integer", example: 99900 },
      billingCycle: { type: "string", enum: ["monthly", "yearly"] },
      description: { type: "string" },
      status: { type: "string", enum: ["active", "inactive"], default: "active" },
    },
    required: ["name", "amountCents", "billingCycle"],
  },

  UpdatePlanInput: {
    type: "object",
    properties: {
      name: { type: "string" },
      amountCents: { type: "integer" },
      billingCycle: { type: "string", enum: ["monthly", "yearly"] },
      description: { type: "string" },
      status: { type: "string", enum: ["active", "inactive"] },
    },
  },

  Subscription: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      memberId: { type: "string", format: "uuid" },
      planId: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["active", "pending", "expired", "canceled"] },
      startDate: { type: "string", format: "date", example: "2026-04-01" },
      endDate: { type: "string", format: "date", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "memberId", "planId", "status", "startDate", "createdAt"],
  },

  CreateSubscriptionInput: {
    type: "object",
    properties: {
      memberId: { type: "string", format: "uuid" },
      planId: { type: "string", format: "uuid" },
      startDate: { type: "string", format: "date", example: "2026-04-01" },
      status: { type: "string", enum: ["active", "pending", "expired", "canceled"], default: "active" },
      endDate: { type: "string", format: "date" },
    },
    required: ["memberId", "planId", "startDate"],
  },

  UpdateSubscriptionInput: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["active", "pending", "expired", "canceled"] },
      startDate: { type: "string", format: "date" },
      endDate: { type: "string", format: "date", nullable: true },
    },
  },

  Invoice: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      memberId: { type: "string", format: "uuid" },
      subscriptionId: { type: "string", format: "uuid", nullable: true },
      invoiceNumber: { type: "string", example: "INV-MYGYM-202604-001" },
      amountCents: { type: "integer", example: 99900 },
      dueDate: { type: "string", format: "date", example: "2026-04-07" },
      status: { type: "string", enum: ["pending", "paid", "overdue"] },
      issuedAt: { type: "string", format: "date-time" },
      paidAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "memberId", "invoiceNumber", "amountCents", "dueDate", "status", "issuedAt", "createdAt"],
  },

  CreateInvoiceInput: {
    type: "object",
    properties: {
      memberId: { type: "string", format: "uuid" },
      invoiceNumber: { type: "string", example: "INV-MYGYM-202604-001" },
      amountCents: { type: "integer", example: 99900 },
      dueDate: { type: "string", format: "date", example: "2026-04-07" },
      subscriptionId: { type: "string", format: "uuid" },
    },
    required: ["memberId", "invoiceNumber", "amountCents", "dueDate"],
  },

  Payment: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      invoiceId: { type: "string", format: "uuid" },
      amountCents: { type: "integer", example: 99900 },
      method: { type: "string", nullable: true, example: "razorpay" },
      status: { type: "string", enum: ["pending", "paid", "failed"] },
      transactionRef: { type: "string", nullable: true },
      metadata: { type: "object", additionalProperties: true },
      paidAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "invoiceId", "amountCents", "status", "createdAt"],
  },

  CreatePaymentInput: {
    type: "object",
    properties: {
      invoiceId: { type: "string", format: "uuid" },
      amountCents: { type: "integer", example: 99900 },
      method: { type: "string", example: "cash" },
      status: { type: "string", enum: ["pending", "paid", "failed"], default: "pending" },
      transactionRef: { type: "string" },
    },
    required: ["invoiceId", "amountCents"],
  },

  UpdatePaymentStatusInput: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["pending", "paid", "failed"] },
    },
    required: ["status"],
  },

  RegisterTenantInput: {
    type: "object",
    properties: {
      businessName: { type: "string", example: "My Gym" },
      tenantCode: { type: "string", example: "mygym", description: "Lowercase alphanumeric + underscore" },
      adminName: { type: "string", example: "Admin User" },
      adminEmail: { type: "string", format: "email", example: "admin@mygym.com" },
      password: { type: "string", minLength: 8, example: "securepassword123" },
    },
    required: ["businessName", "tenantCode", "adminName", "adminEmail", "password"],
  },

  RegisterTenantResponse: {
    type: "object",
    properties: {
      tenantId: { type: "string", format: "uuid" },
      tenantCode: { type: "string", example: "mygym" },
      adminUserId: { type: "string", format: "uuid" },
    },
  },

  LoginInput: {
    type: "object",
    properties: {
      tenantCode: { type: "string", example: "mygym" },
      email: { type: "string", format: "email", example: "admin@mygym.com" },
      password: { type: "string", example: "securepassword123" },
    },
    required: ["tenantCode", "email", "password"],
  },

  LoginResponse: {
    type: "object",
    properties: {
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      user: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["Admin", "Member"] },
        },
      },
      tenant: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string", example: "mygym" },
          name: { type: "string", example: "My Gym" },
        },
      },
    },
  },

  AuthenticatedUser: {
    type: "object",
    properties: {
      userId: { type: "string", format: "uuid" },
      tenantId: { type: "string", format: "uuid" },
      role: { type: "string", enum: ["Admin", "Member"] },
    },
  },

  TenantUser: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      full_name: { type: "string" },
      role: { type: "string", enum: ["Admin", "Member"] },
      is_active: { type: "boolean" },
      created_at: { type: "string", format: "date-time" },
    },
  },

  CreateOrderInput: {
    type: "object",
    properties: {
      invoiceId: { type: "string", format: "uuid" },
      amountCents: { type: "integer", description: "Override invoice amount (optional)" },
      currency: { type: "string", default: "INR" },
    },
    required: ["invoiceId"],
  },

  OrderResponse: {
    type: "object",
    properties: {
      orderId: { type: "string", example: "order_Xxxxxxxxxxxxxx" },
      amount: { type: "integer", example: 99900 },
      currency: { type: "string", example: "INR" },
      paymentRecordId: { type: "string", format: "uuid" },
    },
  },

  CreatePaymentLinkInput: {
    type: "object",
    properties: {
      invoiceId: { type: "string", format: "uuid" },
      amountCents: { type: "integer" },
      currency: { type: "string", default: "INR" },
      customerName: { type: "string" },
      customerEmail: { type: "string", format: "email" },
    },
    required: ["invoiceId"],
  },

  PaymentLinkResponse: {
    type: "object",
    properties: {
      paymentLinkId: { type: "string" },
      shortUrl: { type: "string", format: "uri", example: "https://rzp.io/i/xxxxxxx" },
      amount: { type: "integer", example: 99900 },
      currency: { type: "string", example: "INR" },
      paymentRecordId: { type: "string", format: "uuid" },
    },
  },

  HealthResponse: {
    type: "object",
    properties: {
      service: { type: "string", example: "feeautomate-backend" },
      status: { type: "string", example: "ok" },
    },
  },
};

/* ────────────────────────── helper wrappers ─────────────────────────── */

function successResponse(dataRef: string, description = "Successful response"): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: `#/components/schemas/${dataRef}` },
          },
        },
      },
    },
  };
}

function successArrayResponse(dataRef: string, description = "Successful response"): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: `#/components/schemas/${dataRef}` } },
          },
        },
      },
    },
  };
}

function messageResponse(description: string): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: description },
          },
        },
      },
    },
  };
}

function errorRef(code: string, description: string): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
      },
    },
  };
}

/* ────────────────────────── reusable parameters ────────────────────── */

const tenantHeader: OpenAPIV3.ParameterObject = {
  name: "x-tenant-id",
  in: "header",
  required: true,
  description: "Tenant code or UUID. Example: `mygym`",
  schema: { type: "string", example: "mygym" },
};

const idParam: OpenAPIV3.ParameterObject = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

/* ────────────────────────── paths ──────────────────────────────────── */

const paths: OpenAPIV3.PathsObject = {
  /* ── Health ─────────────────────────────────────────────────────── */
  "/health": {
    get: {
      tags: ["Health"],
      summary: "Health check",
      operationId: "getHealth",
      responses: {
        "200": successResponse("HealthResponse", "Service is healthy"),
      },
    },
  },

  /* ── Auth ────────────────────────────────────────────────────────── */
  "/auth/register-tenant": {
    post: {
      tags: ["Authentication"],
      summary: "Register a new tenant with admin user",
      operationId: "registerTenant",
      description: "Creates a new tenant, provisions a PostgreSQL schema with all domain tables, and creates the first admin user.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterTenantInput" } } },
      },
      responses: {
        "201": successResponse("RegisterTenantResponse", "Tenant registered successfully"),
        "400": errorRef("400", "Validation error (missing fields, invalid tenant code, weak password)"),
        "409": errorRef("409", "Tenant code already exists"),
      },
    },
  },

  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Login with tenant code, email, and password",
      operationId: "login",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } } },
      },
      responses: {
        "200": successResponse("LoginResponse", "Login successful"),
        "401": errorRef("401", "Invalid credentials"),
      },
    },
  },

  "/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get current authenticated user",
      operationId: "getMe",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("AuthenticatedUser", "Current user profile"),
        "401": errorRef("401", "Unauthorized — invalid or missing token"),
      },
    },
  },

  "/auth/admin-only": {
    get: {
      tags: ["Authentication"],
      summary: "Admin-only test endpoint",
      operationId: "adminOnly",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("AuthenticatedUser", "Admin access confirmed"),
        "401": errorRef("401", "Unauthorized"),
        "403": errorRef("403", "Forbidden — Admin role required"),
      },
    },
  },

  /* ── Tenant ─────────────────────────────────────────────────────── */
  "/tenant/users": {
    get: {
      tags: ["Tenant"],
      summary: "List users in the current tenant",
      operationId: "listTenantUsers",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      responses: {
        "200": {
          description: "List of tenant users",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      tenantId: { type: "string", format: "uuid" },
                      tenantCode: { type: "string" },
                      users: { type: "array", items: { $ref: "#/components/schemas/TenantUser" } },
                    },
                  },
                },
              },
            },
          },
        },
        "400": errorRef("400", "Tenant context missing"),
        "401": errorRef("401", "Unauthorized"),
      },
    },
  },

  /* ── Members ────────────────────────────────────────────────────── */
  "/members": {
    post: {
      tags: ["Members"],
      summary: "Create a member",
      operationId: "createMember",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreateMemberInput" } } },
      },
      responses: {
        "201": successResponse("Member", "Member created"),
        "400": errorRef("400", "Validation error"),
        "401": errorRef("401", "Unauthorized"),
      },
    },
    get: {
      tags: ["Members"],
      summary: "List all members",
      operationId: "listMembers",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      responses: {
        "200": successArrayResponse("Member", "List of members"),
        "401": errorRef("401", "Unauthorized"),
      },
    },
  },

  "/members/{id}": {
    get: {
      tags: ["Members"],
      summary: "Get a member by ID",
      operationId: "getMemberById",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      responses: {
        "200": successResponse("Member"),
        "404": errorRef("404", "Member not found"),
      },
    },
    put: {
      tags: ["Members"],
      summary: "Update a member",
      operationId: "updateMember",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateMemberInput" } } },
      },
      responses: {
        "200": successResponse("Member", "Member updated"),
        "404": errorRef("404", "Member not found"),
      },
    },
    delete: {
      tags: ["Members"],
      summary: "Delete a member (Admin only)",
      operationId: "deleteMember",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      responses: {
        "200": messageResponse("Member deleted"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Member not found"),
      },
    },
  },

  /* ── Plans ──────────────────────────────────────────────────────── */
  "/plans": {
    post: {
      tags: ["Plans"],
      summary: "Create a plan (Admin only)",
      operationId: "createPlan",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePlanInput" } } },
      },
      responses: {
        "201": successResponse("Plan", "Plan created"),
        "400": errorRef("400", "Validation error"),
        "403": errorRef("403", "Forbidden — Admin role required"),
      },
    },
    get: {
      tags: ["Plans"],
      summary: "List all plans",
      operationId: "listPlans",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      responses: {
        "200": successArrayResponse("Plan", "List of plans"),
      },
    },
  },

  "/plans/{id}": {
    get: {
      tags: ["Plans"],
      summary: "Get a plan by ID",
      operationId: "getPlanById",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      responses: {
        "200": successResponse("Plan"),
        "404": errorRef("404", "Plan not found"),
      },
    },
    put: {
      tags: ["Plans"],
      summary: "Update a plan (Admin only)",
      operationId: "updatePlan",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePlanInput" } } },
      },
      responses: {
        "200": successResponse("Plan", "Plan updated"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Plan not found"),
      },
    },
    delete: {
      tags: ["Plans"],
      summary: "Delete a plan (Admin only)",
      operationId: "deletePlan",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      responses: {
        "200": messageResponse("Plan deleted"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Plan not found"),
      },
    },
  },

  /* ── Subscriptions ──────────────────────────────────────────────── */
  "/subscriptions": {
    post: {
      tags: ["Subscriptions"],
      summary: "Create a subscription (assign plan to member)",
      operationId: "createSubscription",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSubscriptionInput" } } },
      },
      responses: {
        "201": successResponse("Subscription", "Subscription created"),
        "400": errorRef("400", "Validation error"),
        "404": errorRef("404", "Member or plan not found"),
      },
    },
    get: {
      tags: ["Subscriptions"],
      summary: "List all subscriptions",
      operationId: "listSubscriptions",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      responses: {
        "200": successArrayResponse("Subscription", "List of subscriptions"),
      },
    },
  },

  "/subscriptions/{id}": {
    get: {
      tags: ["Subscriptions"],
      summary: "Get a subscription by ID",
      operationId: "getSubscriptionById",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      responses: {
        "200": successResponse("Subscription"),
        "404": errorRef("404", "Subscription not found"),
      },
    },
    put: {
      tags: ["Subscriptions"],
      summary: "Update a subscription",
      operationId: "updateSubscription",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateSubscriptionInput" } } },
      },
      responses: {
        "200": successResponse("Subscription", "Subscription updated"),
        "404": errorRef("404", "Subscription not found"),
      },
    },
    delete: {
      tags: ["Subscriptions"],
      summary: "Delete a subscription (Admin only)",
      operationId: "deleteSubscription",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      responses: {
        "200": messageResponse("Subscription deleted"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Subscription not found"),
      },
    },
  },

  /* ── Invoices ───────────────────────────────────────────────────── */
  "/invoices": {
    post: {
      tags: ["Invoices"],
      summary: "Create an invoice (Admin only)",
      operationId: "createInvoice",
      description: "Creates an invoice and sends an email notification to the member.",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreateInvoiceInput" } } },
      },
      responses: {
        "201": successResponse("Invoice", "Invoice created"),
        "400": errorRef("400", "Validation error"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Member or subscription not found"),
      },
    },
    get: {
      tags: ["Invoices"],
      summary: "List all invoices",
      operationId: "listInvoices",
      description: "Returns all invoices. Automatically transitions stale `pending` invoices to `overdue` if past due date.",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      responses: {
        "200": successArrayResponse("Invoice", "List of invoices"),
      },
    },
  },

  /* ── Payments ───────────────────────────────────────────────────── */
  "/payments": {
    post: {
      tags: ["Payments"],
      summary: "Record a payment (Admin only)",
      operationId: "createPayment",
      description: "Creates a payment record. If status is `paid`, the linked invoice is automatically marked as paid.",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePaymentInput" } } },
      },
      responses: {
        "201": successResponse("Payment", "Payment recorded"),
        "400": errorRef("400", "Validation error"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Invoice not found"),
      },
    },
    get: {
      tags: ["Payments"],
      summary: "List payments for an invoice",
      operationId: "listPaymentsByInvoice",
      security: [{ bearerAuth: [] }],
      parameters: [
        tenantHeader,
        {
          name: "invoiceId",
          in: "query",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Invoice ID to filter payments by",
        },
      ],
      responses: {
        "200": successArrayResponse("Payment", "List of payments"),
        "400": errorRef("400", "Missing invoiceId query parameter"),
        "404": errorRef("404", "Invoice not found"),
      },
    },
  },

  "/payments/{id}/status": {
    patch: {
      tags: ["Payments"],
      summary: "Update payment status (Admin only)",
      operationId: "updatePaymentStatus",
      description: "Updates the payment status. Setting to `paid` automatically marks the invoice as paid and sends a receipt email.",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader, idParam],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePaymentStatusInput" } } },
      },
      responses: {
        "200": successResponse("Payment", "Payment status updated"),
        "400": errorRef("400", "Invalid status"),
        "403": errorRef("403", "Forbidden — Admin role required"),
        "404": errorRef("404", "Payment not found"),
      },
    },
  },

  /* ── Razorpay ───────────────────────────────────────────────────── */
  "/razorpay/order": {
    post: {
      tags: ["Razorpay"],
      summary: "Create a Razorpay order for an invoice (Admin only)",
      operationId: "createRazorpayOrder",
      description: "Creates a Razorpay order and a pending payment record. Use the returned `orderId` with the Razorpay checkout SDK.",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderInput" } } },
      },
      responses: {
        "201": successResponse("OrderResponse", "Razorpay order created"),
        "400": errorRef("400", "Missing invoiceId or tenant context"),
        "404": errorRef("404", "Invoice not found"),
      },
    },
  },

  "/razorpay/payment-link": {
    post: {
      tags: ["Razorpay"],
      summary: "Create a Razorpay payment link for an invoice (Admin only)",
      operationId: "createRazorpayPaymentLink",
      description: "Generates a Razorpay payment link that can be shared with the member via email or WhatsApp.",
      security: [{ bearerAuth: [] }],
      parameters: [tenantHeader],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePaymentLinkInput" } } },
      },
      responses: {
        "201": successResponse("PaymentLinkResponse", "Payment link created"),
        "400": errorRef("400", "Missing invoiceId or tenant context"),
        "404": errorRef("404", "Invoice not found"),
      },
    },
  },

  /* ── Webhooks ───────────────────────────────────────────────────── */
  "/webhooks/razorpay": {
    post: {
      tags: ["Webhooks"],
      summary: "Razorpay webhook handler",
      operationId: "handleRazorpayWebhook",
      description: "Receives Razorpay webhook events. Validates the `x-razorpay-signature` header using HMAC-SHA256. Processes `payment.captured` and `payment.failed` events to update payment and invoice records.",
      parameters: [
        {
          name: "x-razorpay-signature",
          in: "header",
          required: true,
          schema: { type: "string" },
          description: "HMAC-SHA256 signature for payload verification",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                event: { type: "string", example: "payment.captured" },
                payload: {
                  type: "object",
                  properties: {
                    payment: {
                      type: "object",
                      properties: {
                        entity: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            amount: { type: "integer" },
                            currency: { type: "string" },
                            status: { type: "string" },
                            order_id: { type: "string" },
                            notes: {
                              type: "object",
                              properties: {
                                tenantCode: { type: "string" },
                                invoiceId: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        "200": messageResponse("Webhook processed"),
        "400": errorRef("400", "Missing signature or invalid payload"),
        "401": errorRef("401", "Invalid webhook signature"),
      },
    },
  },
};

/* ────────────────────────── full document ───────────────────────────── */

export const swaggerDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "FeeAutomate API",
    version: "1.0.0",
    description:
      "REST API for FeeAutomate — a multi-tenant SaaS platform for automated fee collection. " +
      "Designed for gyms, hostels, coaching centres, and subscription businesses.\n\n" +
      "## Authentication\n" +
      "Most endpoints require a Bearer JWT token obtained via `POST /auth/login`. " +
      "Include it in the `Authorization` header as `Bearer <token>`.\n\n" +
      "## Multi-Tenancy\n" +
      "Tenant-scoped endpoints require a tenant identifier via the `x-tenant-id` header " +
      "(e.g., `mygym`) or a tenant subdomain (e.g., `mygym.feeautomate.com`).\n\n" +
      "## Amounts\n" +
      "All monetary values are in **paise** (1 INR = 100 paise). For example, ₹999 = `99900`.",
    contact: {
      name: "FeeAutomate Support",
      email: "support@feeautomate.com",
    },
  },
  servers: [
    { url: "/api/v1", description: "Current server (relative)" },
    { url: "http://localhost:4000/api/v1", description: "Local development" },
    { url: "https://api.feeautomate.com/api/v1", description: "Production" },
  ],
  tags: [
    { name: "Health", description: "Service health endpoints" },
    { name: "Authentication", description: "Tenant registration and user authentication" },
    { name: "Tenant", description: "Tenant user management" },
    { name: "Members", description: "Member CRUD operations" },
    { name: "Plans", description: "Billing plan management" },
    { name: "Subscriptions", description: "Member-plan subscription management" },
    { name: "Invoices", description: "Invoice creation and listing" },
    { name: "Payments", description: "Payment recording and status management" },
    { name: "Razorpay", description: "Razorpay payment gateway integration" },
    { name: "Webhooks", description: "External webhook handlers" },
  ],
  paths,
  components: {
    schemas: schemas as Record<string, OpenAPIV3.SchemaObject>,
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token obtained from `POST /auth/login`",
      },
    },
  },
};
