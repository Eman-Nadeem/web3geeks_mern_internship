export function getOpenApiSpec() {
  return {
    openapi: "3.0.0",
    info: {
      title: "Real-Time Document Editor API",
      version: "1.0.0",
      description:
        "OpenAPI specification for the Collaborative Document Editor REST API (Day 1 Foundation). Provides document CRUD operations with Zod validation.",
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Application Environment",
      },
    ],
    paths: {
      "/api/health": {
        get: {
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
                      timestamp: { type: "string", example: "2026-09-07T12:00:00.000Z" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/documents": {
        get: {
          summary: "Get All Documents",
          description: "Fetches a list of all documents owned by the user.",
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
          },
        },
        post: {
          summary: "Create New Document",
          description: "Creates a new document with an optional title and content payload.",
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
            "400": {
              description: "Invalid input payload",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/documents/{id}": {
        get: {
          summary: "Get Document By ID",
          description: "Fetches a single document by its unique identifier.",
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
            "404": {
              description: "Document not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        put: {
          summary: "Update Document",
          description: "Updates document title, HTML content, or JSON structure.",
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
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Document not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        delete: {
          summary: "Delete Document",
          description: "Deletes a document permanently.",
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
            "404": {
              description: "Document not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Document: {
          type: "object",
          properties: {
            id: { type: "string", example: "clx123456789" },
            title: { type: "string", example: "Untitled Document" },
            content: { type: "string", example: "<p>Hello World</p>" },
            jsonContent: { type: "string", nullable: true, example: null },
            ownerId: { type: "string", example: "user_demo_123" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateDocumentInput: {
          type: "object",
          properties: {
            title: { type: "string", example: "Project Roadmap" },
            content: { type: "string", example: "<p>Initial content...</p>" },
            jsonContent: { type: "string", nullable: true },
          },
        },
        UpdateDocumentInput: {
          type: "object",
          properties: {
            title: { type: "string", example: "Updated Roadmap Title" },
            content: { type: "string", example: "<p>Updated content...</p>" },
            jsonContent: { type: "string", nullable: true },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Invalid request payload" },
            details: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  };
}
