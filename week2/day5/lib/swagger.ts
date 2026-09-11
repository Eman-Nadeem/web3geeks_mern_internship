export function getOpenApiSpec() {
  return {
    openapi: "3.0.0",
    info: {
      title: "SyncDocs Real-Time Collaborative Document Editor API",
      version: "2.0.0",
      description:
        "OpenAPI specification for SyncDocs: Day 2 Authentication + Real-Time Collaborative Synchronization Engine. Provides JWT credentials auth, user scoping & ownership enforcement (401/403), document CRUD operations, and real-time Socket.IO room contracts.",
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Next.js Application Environment",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_token",
          description: "HTTP-only secure JWT session cookie issued on login/register.",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token passed in Authorization header or Socket.IO handshake auth object.",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "user_clx123456" },
            email: { type: "string", format: "email", example: "demo@example.com" },
            name: { type: "string", example: "Demo Architect" },
            avatarUrl: {
              type: "string",
              nullable: true,
              example: "https://api.dicebear.com/7.x/bottts/svg?seed=DemoArchitect",
            },
          },
        },
        RegisterInput: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email", example: "sarah@example.com" },
            password: { type: "string", minLength: 6, example: "Password123!" },
            name: { type: "string", example: "Sarah Jenkins" },
            avatarUrl: { type: "string", nullable: true, example: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
          },
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "demo@example.com" },
            password: { type: "string", example: "Password123!" },
          },
        },
        UpdateProfileInput: {
          type: "object",
          properties: {
            name: { type: "string", example: "Sarah Jenkins, Lead Architect" },
            avatarUrl: { type: "string", example: "https://api.dicebear.com/7.x/bottts/svg?seed=NewAvatar" },
          },
        },
        Document: {
          type: "object",
          properties: {
            id: { type: "string", example: "clx123456789" },
            title: { type: "string", example: "System Architecture Roadmap" },
            content: { type: "string", example: "<p>Real-time collaboration foundation with Socket.IO</p>" },
            jsonContent: { type: "string", nullable: true, example: null },
            ownerId: { type: "string", example: "user_clx123456" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            owner: { $ref: "#/components/schemas/User" },
          },
        },
        CreateDocumentInput: {
          type: "object",
          properties: {
            title: { type: "string", example: "Sprint 4 Specifications" },
            content: { type: "string", example: "<p>Start typing your document here...</p>" },
            jsonContent: { type: "string", nullable: true },
          },
        },
        UpdateDocumentInput: {
          type: "object",
          properties: {
            title: { type: "string", example: "Sprint 4 Specifications (Final)" },
            content: { type: "string", example: "<p>Updated real-time specifications</p>" },
            jsonContent: { type: "string", nullable: true },
          },
        },
        Collaborator: {
          type: "object",
          properties: {
            id: { type: "string", example: "user_123" },
            name: { type: "string", example: "Demo Architect" },
            email: { type: "string", example: "demo@example.com" },
            avatarUrl: { type: "string", nullable: true },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Unauthorized or Invalid request" },
            details: { type: "object" },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["System"],
          summary: "Health Check",
          description: "Returns application status and timestamp.",
          responses: {
            "200": {
              description: "System healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      timestamp: { type: "string", example: "2026-09-08T15:00:00.000Z" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "User Registration",
          description: "Creates a new user account with bcrypt hashed password, returns user profile, and sets auth_token cookie.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Registered successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/User" },
                      message: { type: "string", example: "User registered successfully" },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error" },
            "409": { description: "Email already registered" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "User Sign In",
          description: "Verifies email and password, sets httpOnly auth_token cookie, and returns user profile.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Logged in successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/User" },
                      message: { type: "string", example: "Logged in successfully" },
                    },
                  },
                },
              },
            },
            "401": { description: "Invalid email or password" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Authentication"],
          summary: "User Sign Out",
          description: "Clears the httpOnly auth_token session cookie.",
          responses: {
            "200": {
              description: "Logged out successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Logged out successfully" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Authentication"],
          summary: "Get Current User Profile",
          description: "Returns the currently authenticated user session details.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "Current user profile",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
          },
        },
        put: {
          tags: ["Authentication"],
          summary: "Update Profile & Avatar",
          description: "Updates user's display name and profile avatar image URL.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Profile updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/User" },
                      message: { type: "string", example: "Profile updated successfully" },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/documents": {
        get: {
          tags: ["Documents"],
          summary: "Get Current User Documents",
          description: "Fetches all documents owned by the currently authenticated user.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of documents",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Document" },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized. Please log in." },
          },
        },
        post: {
          tags: ["Documents"],
          summary: "Create New Document",
          description: "Creates a document scoped to the authenticated user.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateDocumentInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Document created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Document" },
                    },
                  },
                },
              },
            },
            "400": { description: "Invalid input payload" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/documents/{id}": {
        get: {
          tags: ["Documents"],
          summary: "Get Document By ID",
          description: "Fetches a single document. Enforces ownership: returns 403 Forbidden if not owned by caller.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document ID",
            },
          ],
          responses: {
            "200": {
              description: "Document details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Document" },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden: You do not have permission to access this document" },
            "404": { description: "Document not found" },
          },
        },
        put: {
          tags: ["Documents"],
          summary: "Update Document",
          description: "Updates document title or content. Enforces ownership: returns 403 Forbidden if not owned by caller.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateDocumentInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Document updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Document" },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden: You do not own this document" },
            "404": { description: "Document not found" },
          },
        },
        delete: {
          tags: ["Documents"],
          summary: "Delete Document",
          description: "Deletes a document permanently. Enforces ownership: returns 403 Forbidden if not owned by caller.",
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document ID",
            },
          ],
          responses: {
            "200": {
              description: "Document deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Document deleted successfully" },
                      id: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden: You do not own this document" },
            "404": { description: "Document not found" },
          },
        },
      },
    },
  };
}
