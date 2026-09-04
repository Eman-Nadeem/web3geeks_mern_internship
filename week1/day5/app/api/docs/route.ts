import { NextResponse } from 'next/server';

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Tenant Project Management System API',
      version: '1.0.0',
      description:
        'Production-grade RESTful API documentation for Day 4 Multi-Tenant business features (Projects, Tasks, and Teams) with RBAC and tenant data isolation.',
    },
    servers: [
      {
        url: 'https://web3geeks-mern-internship.vercel.app',
        description: 'Production Vercel Deployment',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token obtained from /api/auth/login',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'User Login',
          description: 'Authenticates a user and returns a JWT access token.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@acme.com' },
                    password: { type: 'string', example: 'Password123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Authenticated successfully' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/api/projects': {
        get: {
          summary: 'List Projects',
          description: 'Retrieves a paginated list of projects scoped to the authenticated tenant organization.',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'createdAt' } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'List of projects with pagination metadata' } },
        },
        post: {
          summary: 'Create Project',
          description: 'Creates a new project (Requires PROJECT_CREATE permission).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'Customer Portal Redesign' },
                    description: { type: 'string', example: 'Revamping customer UI' },
                    status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'], default: 'PLANNING' },
                    startDate: { type: 'string', format: 'date-time' },
                    dueDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Project created successfully' } },
        },
      },
      '/api/projects/{id}': {
        get: {
          summary: 'Get Project Details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Project details' }, 404: { description: 'Project not found' } },
        },
        patch: {
          summary: 'Update Project',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Project updated' } },
        },
        delete: {
          summary: 'Delete Project',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'force', in: 'query', schema: { type: 'boolean', default: false }, description: 'Force delete project even if active tasks exist' },
          ],
          responses: { 200: { description: 'Project deleted' }, 400: { description: 'Active tasks safeguard triggered' } },
        },
      },
      '/api/teams': {
        get: {
          summary: 'List Teams',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'List of teams' } },
        },
        post: {
          summary: 'Create Team',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'Frontend Guild' },
                    description: { type: 'string', example: 'Acme Web UI/UX Team' },
                    leaderId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Team created' } },
        },
      },
      '/api/teams/{id}': {
        get: {
          summary: 'Get Team Details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Team details' } },
        },
        patch: {
          summary: 'Update Team',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Frontend Guild Updated' },
                    description: { type: 'string', example: 'Updated team description' },
                    leaderId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Team updated' } },
        },
        delete: {
          summary: 'Delete Team',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Team deleted' } },
        },
      },
      '/api/teams/{id}/members': {
        post: {
          summary: 'Add Team Member',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId'],
                  properties: { userId: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Member added to team' } },
        },
        delete: {
          summary: 'Remove Team Member',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Member removed from team' } },
        },
      },
      '/api/tasks': {
        get: {
          summary: 'List Tasks',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED'] } },
            { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] } },
            { name: 'projectId', in: 'query', schema: { type: 'string' } },
            { name: 'assigneeId', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'List of tasks' } },
        },
        post: {
          summary: 'Create Task',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['projectId', 'title'],
                  properties: {
                    projectId: { type: 'string' },
                    title: { type: 'string', example: 'Design Dark Mode Wireframes' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED'], default: 'TO_DO' },
                    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
                    assigneeId: { type: 'string' },
                    dueDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Task created' } },
        },
      },
      '/api/tasks/{id}': {
        get: {
          summary: 'Get Task Details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Task details' } },
        },
        patch: {
          summary: 'Update Task / Transition Status',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    status: { type: 'string', enum: ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED'] },
                    assigneeId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Task updated' }, 400: { description: 'Invalid status transition' } },
        },
        delete: {
          summary: 'Delete Task',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Task deleted' } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
