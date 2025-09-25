# InstantDB MCP Server Setup

This project now includes the InstantDB MCP (Model Context Protocol) server integration, which allows you to interact with your InstantDB applications directly from Cursor.

## What's Been Added

- **MCP Configuration**: Added `.cursor/mcp.json` with InstantDB MCP server configuration
- **Documentation**: This guide to help you get started

## Setup Instructions

### 1. Restart Cursor
After the MCP configuration has been added, you need to restart Cursor to load the new MCP server.

### 2. Authentication
When you first use the InstantDB MCP server, you'll need to authenticate:

1. Open Cursor
2. The InstantDB MCP server will prompt you to authenticate
3. Follow the OAuth flow to grant access to your InstantDB account
4. Complete the authentication process

### 3. Verify Integration
Once authenticated, you can verify the integration by:

1. Opening the MCP panel in Cursor (if available)
2. Looking for the "instant" server in your MCP servers list
3. Testing basic InstantDB operations

## Available MCP Functions

The InstantDB MCP server provides the following capabilities:

### App Management
- **Create Apps**: Create new InstantDB applications
- **List Apps**: View all your InstantDB applications
- **Get App Details**: Retrieve detailed information about specific apps

### Schema Management
- **Get Schema**: Fetch the current schema for an app
- **Push Schema**: Update the schema with new entities, attributes, and relationships
- **Plan Schema Changes**: Preview schema changes before applying them

### Permissions Management
- **Get Permissions**: View current permission rules
- **Push Permissions**: Update permission rules for your app

## Using with Your Mechanic Shop App

Since your project already has InstantDB configured with:
- App ID and Admin Token in environment variables
- Schema defined in `server/src/types/database.ts`
- Database configuration in `server/src/config/instantdb.ts`

You can now use the MCP server to:

1. **Manage your app schema** directly from Cursor
2. **Update permissions** without manual configuration
3. **Create new apps** for testing or staging environments
4. **Inspect your current setup** to ensure everything is configured correctly

## Example Usage

Once the MCP server is active, you can ask Cursor to:

- "Show me my current InstantDB apps"
- "Update the schema to add a new field to the jobs table"
- "Create a new test app for development"
- "Show me the current permissions for my app"

## Troubleshooting

### MCP Server Not Appearing
- Ensure Cursor has been restarted after adding the configuration
- Check that the `.cursor/mcp.json` file is in the correct location
- Verify your internet connection for the remote MCP server

### Authentication Issues
- Make sure you complete the full OAuth flow
- Check that you're logged into the correct InstantDB account
- Try re-authenticating if you encounter permission errors

### Connection Issues
- The MCP server uses HTTPS, so ensure your firewall allows outbound HTTPS connections
- Check InstantDB's status page if you encounter service issues

## Next Steps

1. **Restart Cursor** to load the MCP server
2. **Authenticate** when prompted
3. **Test the integration** by asking about your InstantDB apps
4. **Explore the capabilities** to manage your mechanic shop app's database schema and permissions

## Related Files

- `.cursor/mcp.json` - MCP server configuration
- `server/src/config/instantdb.ts` - Your current InstantDB configuration
- `server/src/types/database.ts` - Your current database schema
- `INSTANTDB_SETUP.md` - Original InstantDB setup guide
