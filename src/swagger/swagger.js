const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'CRUD API with Supabase Auth',
        version: '1.0.0',
        description: 'Complete API with CRUD operations and Supabase Auth',
        contact: {
            name: 'Moscow Abdelaal'
        }
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token from /auth/login'
            }
        },
        schemas: {
            SignupRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'test@example.com' },
                    password: { type: 'string', format: 'password', example: 'password123' }
                }
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'test@example.com' },
                    password: { type: 'string', format: 'password', example: 'password123' }
                }
            },
            Task: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    done: { type: 'boolean' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' }
                }
            }
        }
    },
    paths: {
        '/auth/signup': {
            post: {
                summary: 'Create a new user account',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SignupRequest' }
                        }
                    }
                },
                responses: {
                    '201': { description: 'User created successfully' },
                    '400': { description: 'Invalid input' }
                }
            }
        },
        '/auth/login': {
            post: {
                summary: 'Login and get JWT token',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/LoginRequest' }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Login successful' },
                    '401': { description: 'Invalid credentials' }
                }
            }
        },
        '/auth/logout': {
            post: {
                summary: 'Logout user',
                tags: ['Authentication'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '204': { description: 'Logout successful' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/public/info': {
            get: {
                summary: 'Get public information (no auth required)',
                tags: ['Public'],
                responses: {
                    '200': { description: 'Public info retrieved' }
                }
            }
        },
        '/protected/profile': {
            get: {
                summary: 'Get user profile (requires auth)',
                tags: ['Protected'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Profile data retrieved' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/protected/dashboard': {
            get: {
                summary: 'Get user dashboard (requires auth)',
                tags: ['Protected'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Dashboard data retrieved' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/tasks': {
            get: {
                summary: 'Get all tasks',
                tags: ['Tasks'],
                responses: {
                    '200': {
                        description: 'List of tasks',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Task' }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: 'Create a new task',
                tags: ['Tasks'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['title'],
                                properties: { title: { type: 'string' } }
                            }
                        }
                    }
                },
                responses: {
                    '201': { description: 'Task created' },
                    '400': { description: 'Invalid input' }
                }
            }
        },
        '/tasks/{id}': {
            get: {
                summary: 'Get a single task',
                tags: ['Tasks'],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' }
                    }
                ],
                responses: {
                    '200': { description: 'Task found' },
                    '404': { description: 'Task not found' }
                }
            },
            put: {
                summary: 'Update a task',
                tags: ['Tasks'],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' }
                    }
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    done: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Task updated' },
                    '404': { description: 'Task not found' }
                }
            },
            delete: {
                summary: 'Delete a task',
                tags: ['Tasks'],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' }
                    }
                ],
                responses: {
                    '204': { description: 'Task deleted' },
                    '404': { description: 'Task not found' }
                }
            }
        }
    }
};

function setupSwagger(app) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        swaggerOptions: {
            persistAuthorization: true
        }
    }));
    console.log('📚 Swagger UI available at http://localhost:3000/docs');
}

module.exports = { setupSwagger };