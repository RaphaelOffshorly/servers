# GitHub MCP Server

**Deprecation Notice:** Development for this project has been moved to GitHub in the http://github.com/github/github-mcp-server repo.

---

MCP Server for the GitHub API, enabling file operations, repository management, search functionality, and more.

## Authentication

This server supports two methods for authentication with the GitHub API:

### 1. Environment Variable (Static)

Set the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable before starting the server.

### 2. Dynamic Authentication (Recommended)

Pass your GitHub access token directly with each SSE connection by adding a token parameter to the SSE URL:

```
http://localhost:9000/sse?token=YOUR_GITHUB_TOKEN
```

This allows:
- Different users to use their own tokens
- Switching tokens without restarting the server
- Enhanced security by not storing tokens in environment variables

### Features

- **Automatic Branch Creation**: When creating/updating files or pushing changes, branches are automatically created if they don't exist
- **Comprehensive Error Handling**: Clear error messages for common issues
- **Git History Preservation**: Operations maintain proper Git history without force pushing
- **Batch Operations**: Support for both single-file and multi-file operations
- **Advanced Search**: Support for searching code, issues/PRs, and users


## Tools

1. `create_or_update_file`
   - Create or update a single file in a repository
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `path` (string): Path where to create/update the file
     - `content` (string): Content of the file
     - `message` (string): Commit message
     - `branch` (string): Branch to create/update the file in
     - `sha` (optional string): SHA of file being replaced (for updates)
   - Returns: File content and commit details

2. `push_files`
   - Push multiple files in a single commit
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `branch` (string): Branch to push to
     - `files` (array): Files to push, each with `path` and `content`
     - `message` (string): Commit message
   - Returns: Updated branch reference

3. `search_repositories`
   - Search for GitHub repositories
   - Inputs:
     - `query` (string): Search query
     - `page` (optional number): Page number for pagination
     - `perPage` (optional number): Results per page (max 100)
   - Returns: Repository search results

4. `create_repository`
   - Create a new GitHub repository
   - Inputs:
     - `name` (string): Repository name
     - `description` (optional string): Repository description
     - `private` (optional boolean): Whether repo should be private
     - `autoInit` (optional boolean): Initialize with README
   - Returns: Created repository details

5. `get_file_contents`
   - Get contents of a file or directory
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `path` (string): Path to file/directory
     - `branch` (optional string): Branch to get contents from
   - Returns: File/directory contents

6. `create_issue`
   - Create a new issue
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `title` (string): Issue title
     - `body` (optional string): Issue description
     - `assignees` (optional string[]): Usernames to assign
     - `labels` (optional string[]): Labels to add
     - `milestone` (optional number): Milestone number
   - Returns: Created issue details

7. `create_pull_request`
   - Create a new pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `title` (string): PR title
     - `body` (optional string): PR description
     - `head` (string): Branch containing changes
     - `base` (string): Branch to merge into
     - `draft` (optional boolean): Create as draft PR
     - `maintainer_can_modify` (optional boolean): Allow maintainer edits
   - Returns: Created pull request details

8. `fork_repository`
   - Fork a repository
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `organization` (optional string): Organization to fork to
   - Returns: Forked repository details

9. `create_branch`
   - Create a new branch
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `branch` (string): Name for new branch
     - `from_branch` (optional string): Source branch (defaults to repo default)
   - Returns: Created branch reference

10. `list_issues`
    - List and filter repository issues
    - Inputs:
      - `owner` (string): Repository owner
      - `repo` (string): Repository name
      - `state` (optional string): Filter by state ('open', 'closed', 'all')
      - `labels` (optional string[]): Filter by labels
      - `sort` (optional string): Sort by ('created', 'updated', 'comments')
      - `direction` (optional string): Sort direction ('asc', 'desc')
      - `since` (optional string): Filter by date (ISO 8601 timestamp)
      - `page` (optional number): Page number
      - `per_page` (optional number): Results per page
    - Returns: Array of issue details

11. `update_issue`
    - Update an existing issue
    - Inputs:
      - `owner` (string): Repository owner
      - `repo` (string): Repository name
      - `issue_number` (number): Issue number to update
      - `title` (optional string): New title
      - `body` (optional string): New description
      - `state` (optional string): New state ('open' or 'closed')
      - `labels` (optional string[]): New labels
      - `assignees` (optional string[]): New assignees
      - `milestone` (optional number): New milestone number
    - Returns: Updated issue details

12. `add_issue_comment`
    - Add a comment to an issue
    - Inputs:
      - `owner` (string): Repository owner
      - `repo` (string): Repository name
      - `issue_number` (number): Issue number to comment on
      - `body` (string): Comment text
    - Returns: Created comment details

13. `search_code`
    - Search for code across GitHub repositories
    - Inputs:
      - `q` (string): Search query using GitHub code search syntax
      - `sort` (optional string): Sort field ('indexed' only)
      - `order` (optional string): Sort order ('asc' or 'desc')
      - `per_page` (optional number): Results per page (max 100)
      - `page` (optional number): Page number
    - Returns: Code search results with repository context

14. `search_issues`
    - Search for issues and pull requests
    - Inputs:
      - `q` (string): Search query using GitHub issues search syntax
      - `sort` (optional string): Sort field (comments, reactions, created, etc.)
      - `order` (optional string): Sort order ('asc' or 'desc')
      - `per_page` (optional number): Results per page (max 100)
      - `page` (optional number): Page number
    - Returns: Issue and pull request search results

15. `search_users`
    - Search for GitHub users
    - Inputs:
      - `q` (string): Search query using GitHub users search syntax
      - `sort` (optional string): Sort field (followers, repositories, joined)
      - `order` (optional string): Sort order ('asc' or 'desc')
      - `per_page` (optional number): Results per page (max 100)
      - `page` (optional number): Page number
    - Returns: User search results

16. `list_commits`
   - Gets commits of a branch in a repository
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `page` (optional string): page number
     - `per_page` (optional string): number of record per page
     - `sha` (optional string): branch name
   - Returns: List of commits

17. `get_issue`
   - Gets the contents of an issue within a repository
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `issue_number` (number): Issue number to retrieve
   - Returns: Github Issue object & details

18. `get_pull_request`
   - Get details of a specific pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Pull request details including diff and review status

19. `list_pull_requests`
   - List and filter repository pull requests
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `state` (optional string): Filter by state ('open', 'closed', 'all')
     - `head` (optional string): Filter by head user/org and branch
     - `base` (optional string): Filter by base branch
     - `sort` (optional string): Sort by ('created', 'updated', 'popularity', 'long-running')
     - `direction` (optional string): Sort direction ('asc', 'desc')
     - `per_page` (optional number): Results per page (max 100)
     - `page` (optional number): Page number
   - Returns: Array of pull request details

20. `create_pull_request_review`
   - Create a review on a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
     - `body` (string): Review comment text
     - `event` (string): Review action ('APPROVE', 'REQUEST_CHANGES', 'COMMENT')
     - `commit_id` (optional string): SHA of commit to review
     - `comments` (optional array): Line-specific comments, each with:
       - `path` (string): File path
       - `position` (number): Line position in diff
       - `body` (string): Comment text
   - Returns: Created review details

21. `merge_pull_request`
   - Merge a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
     - `commit_title` (optional string): Title for merge commit
     - `commit_message` (optional string): Extra detail for merge commit
     - `merge_method` (optional string): Merge method ('merge', 'squash', 'rebase')
   - Returns: Merge result details

22. `get_pull_request_files`
   - Get the list of files changed in a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Array of changed files with patch and status details

23. `get_pull_request_status`
   - Get the combined status of all status checks for a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Combined status check results and individual check details

24. `update_pull_request_branch`
   - Update a pull request branch with the latest changes from the base branch (equivalent to GitHub's "Update branch" button)
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
     - `expected_head_sha` (optional string): The expected SHA of the pull request's HEAD ref
   - Returns: Success message when branch is updated

25. `get_pull_request_comments`
   - Get the review comments on a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Array of pull request review comments with details like the comment text, author, and location in the diff

26. `get_pull_request_reviews`
   - Get the reviews on a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Array of pull request reviews with details like the review state (APPROVED, CHANGES_REQUESTED, etc.), reviewer, and review body

## Implementation Notes

### Dynamic Token Authentication

The server supports dynamic authentication by:

1. Accepting a token parameter in the SSE connection URL: `/sse?token=YOUR_TOKEN`
2. Storing this token for the duration of the connection
3. Using the token for all GitHub API requests during that session
4. Falling back to the environment variable if no token is provided

This implementation allows:
- Seamless token switching without server restarts
- Different users to use their own tokens in a multi-user environment
- Improved security by not storing tokens in environment variables
- Compatibility with both token-based and environment-based authentication

### Token Precedence

Tokens are used in the following order:
1. Dynamic token from SSE connection (highest precedence)
2. `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable (fallback)

If neither is available, the server will return an error message indicating that authentication is required.

## Connecting with a Token

### JavaScript/TypeScript Client Example

```javascript
// Example of connecting to the server with a token using EventSource
const token = "your_github_personal_access_token";
const serverUrl = "http://localhost:9000";

// Connect with token in URL parameter
const eventSource = new EventSource(`${serverUrl}/sse?token=${encodeURIComponent(token)}`);

eventSource.onopen = () => {
  console.log("Connection established");
  
  // Now you can send requests to the server
  fetch(`${serverUrl}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "callTool",
      params: {
        name: "list_repositories",
        arguments: {
          // Your arguments here
        }
      }
    })
  });
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received response:", data);
};

eventSource.onerror = (error) => {
  console.error("EventSource error:", error);
  eventSource.close();
};
```

### Python Client Example

```python
import requests
import json
import sseclient
import threading
import urllib.parse

# GitHub token and server URL
token = "your_github_personal_access_token"
server_url = "http://localhost:9000"

# Connect with token in URL parameter
sse_url = f"{server_url}/sse?token={urllib.parse.quote(token)}"

def sse_client():
    headers = {'Accept': 'text/event-stream'}
    response = requests.get(sse_url, headers=headers, stream=True)
    client = sseclient.SSEClient(response)
    
    for event in client.events():
        print(f"Received: {event.data}")

# Start SSE client in background thread
threading.Thread(target=sse_client, daemon=True).start()

# Example request
request_data = {
    "jsonrpc": "2.0",
    "id": "1",
    "method": "callTool",
    "params": {
        "name": "list_repositories",
        "arguments": {
            # Your arguments here
        }
    }
}

# Send request after connection is established
# In a real application, you might want to wait for confirmation of SSE connection
import time
time.sleep(1)  # Simple delay to ensure connection is established

response = requests.post(
    f"{server_url}/message",
    headers={"Content-Type": "application/json"},
    data=json.dumps(request_data)
)

print(f"Request sent, status: {response.status_code}")
```

## Running the Server

### Option 1: Using Environment Variable

```bash
# Set the token in your environment
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here

# Start the server
node index.js
```

### Option 2: Using Dynamic Token

```bash
# Start the server without setting the environment variable
node index.js

# Connect to the server with your token in the client code
# See the "Connecting with a Token" section for examples
```

### Using Docker

```bash
# Build the Docker image
docker build -t github-mcp-server .

# Run with environment variable
docker run -p 9000:9000 -e GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here github-mcp-server

# Or run without the token to use dynamic authentication
docker run -p 9000:9000 github-mcp-server
```
