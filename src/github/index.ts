#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fetch from 'node-fetch';
import express, { Request as ExpressRequest, Response as ExpressResponse } from "express";
import dotenv from "dotenv";
import CryptoJS from "crypto-js";

import * as repository from './operations/repository.js';
import * as files from './operations/files.js';
import * as issues from './operations/issues.js';
import * as pulls from './operations/pulls.js';
import * as branches from './operations/branches.js';
import * as search from './operations/search.js';
import * as commits from './operations/commits.js';
import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
  isGitHubError,
} from './common/errors.js';
import { VERSION } from "./common/version.js";

// Load environment variables
dotenv.config();

// If fetch doesn't exist in global scope, add it
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof global.fetch;
}

// Global access token that can be dynamically set
let dynamicAccessToken: string | null = null;

/**
 * Decrypt AES-encrypted token using the provided encryption key
 * @param encryptedToken - The encrypted token (base64 encoded)
 * @param encryptionKey - The encryption key used for decryption
 * @returns The decrypted token string
 */
function decryptToken(encryptedToken: string, encryptionKey: string): string {
  try {
    // Decrypt the token using AES
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedToken, encryptionKey);
    const decryptedToken = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedToken) {
      throw new Error("Failed to decrypt token - invalid encryption key or corrupted data");
    }
    
    return decryptedToken;
  } catch (error) {
    console.error("Error decrypting token:", error);
    throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to get current token (dynamic or from env)
function getAccessToken(): string | undefined {
  return dynamicAccessToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
}

// Correct implementation of withToken function
async function withToken<T>(fn: () => Promise<T>): Promise<T> {
  const token = getAccessToken();
  try {
    // Call the function, which has access to the token via closure
    return await fn();
  } catch (error) {
    console.error("Error in API call with token:", error);
    throw error;
  }
}

const server = new Server(
  {
    name: "github-mcp-server",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function formatGitHubError(error: GitHubError): string {
  let message = `GitHub API Error: ${error.message}`;
  
  if (error instanceof GitHubValidationError) {
    message = `Validation Error: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GitHubResourceNotFoundError) {
    message = `Not Found: ${error.message}`;
  } else if (error instanceof GitHubAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GitHubPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GitHubRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}\nResets at: ${error.resetAt.toISOString()}`;
  } else if (error instanceof GitHubConflictError) {
    message = `Conflict: ${error.message}`;
  }

  return message;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_or_update_file",
        description: "Create or update a single file in a GitHub repository",
        inputSchema: zodToJsonSchema(files.CreateOrUpdateFileSchema),
      },
      {
        name: "search_repositories",
        description: "Search for GitHub repositories",
        inputSchema: zodToJsonSchema(repository.SearchRepositoriesSchema),
      },
      {
        name: "create_repository",
        description: "Create a new GitHub repository in your account",
        inputSchema: zodToJsonSchema(repository.CreateRepositoryOptionsSchema),
      },
      {
        name: "get_file_contents",
        description: "Get the contents of a file or directory from a GitHub repository",
        inputSchema: zodToJsonSchema(files.GetFileContentsSchema),
      },
      {
        name: "push_files",
        description: "Push multiple files to a GitHub repository in a single commit",
        inputSchema: zodToJsonSchema(files.PushFilesSchema),
      },
      {
        name: "create_issue",
        description: "Create a new issue in a GitHub repository",
        inputSchema: zodToJsonSchema(issues.CreateIssueSchema),
      },
      {
        name: "create_pull_request",
        description: "Create a new pull request in a GitHub repository",
        inputSchema: zodToJsonSchema(pulls.CreatePullRequestSchema),
      },
      {
        name: "fork_repository",
        description: "Fork a GitHub repository to your account or specified organization",
        inputSchema: zodToJsonSchema(repository.ForkRepositorySchema),
      },
      {
        name: "create_branch",
        description: "Create a new branch in a GitHub repository",
        inputSchema: zodToJsonSchema(branches.CreateBranchSchema),
      },
      {
        name: "list_commits",
        description: "Get list of commits of a branch in a GitHub repository",
        inputSchema: zodToJsonSchema(commits.ListCommitsSchema)
      },
      {
        name: "list_issues",
        description: "List issues in a GitHub repository with filtering options",
        inputSchema: zodToJsonSchema(issues.ListIssuesOptionsSchema)
      },
      {
        name: "update_issue",
        description: "Update an existing issue in a GitHub repository",
        inputSchema: zodToJsonSchema(issues.UpdateIssueOptionsSchema)
      },
      {
        name: "add_issue_comment",
        description: "Add a comment to an existing issue",
        inputSchema: zodToJsonSchema(issues.IssueCommentSchema)
      },
      {
        name: "search_code",
        description: "Search for code across GitHub repositories",
        inputSchema: zodToJsonSchema(search.SearchCodeSchema),
      },
      {
        name: "search_issues",
        description: "Search for issues and pull requests across GitHub repositories",
        inputSchema: zodToJsonSchema(search.SearchIssuesSchema),
      },
      {
        name: "search_users",
        description: "Search for users on GitHub",
        inputSchema: zodToJsonSchema(search.SearchUsersSchema),
      },
      {
        name: "get_issue",
        description: "Get details of a specific issue in a GitHub repository.",
        inputSchema: zodToJsonSchema(issues.GetIssueSchema)
      },
      {
        name: "get_pull_request",
        description: "Get details of a specific pull request",
        inputSchema: zodToJsonSchema(pulls.GetPullRequestSchema)
      },
      {
        name: "list_pull_requests",
        description: "List and filter repository pull requests",
        inputSchema: zodToJsonSchema(pulls.ListPullRequestsSchema)
      },
      {
        name: "create_pull_request_review",
        description: "Create a review on a pull request",
        inputSchema: zodToJsonSchema(pulls.CreatePullRequestReviewSchema)
      },
      {
        name: "merge_pull_request",
        description: "Merge a pull request",
        inputSchema: zodToJsonSchema(pulls.MergePullRequestSchema)
      },
      {
        name: "get_pull_request_files",
        description: "Get the list of files changed in a pull request",
        inputSchema: zodToJsonSchema(pulls.GetPullRequestFilesSchema)
      },
      {
        name: "get_pull_request_status",
        description: "Get the combined status of all status checks for a pull request",
        inputSchema: zodToJsonSchema(pulls.GetPullRequestStatusSchema)
      },
      {
        name: "update_pull_request_branch",
        description: "Update a pull request branch with the latest changes from the base branch",
        inputSchema: zodToJsonSchema(pulls.UpdatePullRequestBranchSchema)
      },
      {
        name: "get_pull_request_comments",
        description: "Get the review comments on a pull request",
        inputSchema: zodToJsonSchema(pulls.GetPullRequestCommentsSchema)
      },
      {
        name: "get_pull_request_reviews",
        description: "Get the reviews on a pull request",
        inputSchema: zodToJsonSchema(pulls.GetPullRequestReviewsSchema)
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    // Check if token is available when needed
    if (!getAccessToken()) {
      throw new Error("GitHub access token not provided. Please connect with a valid token.");
    }

    switch (request.params.name) {
      case "fork_repository": {
        const args = repository.ForkRepositorySchema.parse(request.params.arguments);
        const token = getAccessToken();
        const fork = await repository.forkRepository(
          args.owner, 
          args.repo, 
          args.organization, 
          token
        );
        return {
          content: [{ type: "text", text: JSON.stringify(fork, null, 2) }],
        };
      }

      case "create_branch": {
        const args = branches.CreateBranchSchema.parse(request.params.arguments);
        const token = getAccessToken();
        const branch = await branches.createBranchFromRef(
          args.owner,
          args.repo,
          args.branch,
          args.from_branch,
          token
        );
        return {
          content: [{ type: "text", text: JSON.stringify(branch, null, 2) }],
        };
      }

      case "search_repositories": {
        const args = repository.SearchRepositoriesSchema.parse(request.params.arguments);
        const results = await withToken(() => repository.searchRepositories(
          args.query,
          args.page,
          args.perPage
        ));
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "create_repository": {
        const args = repository.CreateRepositoryOptionsSchema.parse(request.params.arguments);
        const result = await withToken(() => repository.createRepository(args));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_file_contents": {
        const args = files.GetFileContentsSchema.parse(request.params.arguments);
        const contents = await withToken(() => files.getFileContents(
          args.owner,
          args.repo,
          args.path,
          args.branch
        ));
        return {
          content: [{ type: "text", text: JSON.stringify(contents, null, 2) }],
        };
      }

      case "create_or_update_file": {
        const args = files.CreateOrUpdateFileSchema.parse(request.params.arguments);
        const result = await withToken(() => files.createOrUpdateFile(
          args.owner,
          args.repo,
          args.path,
          args.content,
          args.message,
          args.branch,
          args.sha
        ));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "push_files": {
        const args = files.PushFilesSchema.parse(request.params.arguments);
        const result = await withToken(() => files.pushFiles(
          args.owner,
          args.repo,
          args.branch,
          args.files,
          args.message
        ));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "create_issue": {
        const args = issues.CreateIssueSchema.parse(request.params.arguments);
        const { owner, repo, ...options } = args;
        
        try {
          console.error(`[DEBUG] Attempting to create issue in ${owner}/${repo}`);
          console.error(`[DEBUG] Issue options:`, JSON.stringify(options, null, 2));
          
          const issue = await withToken(() => issues.createIssue(owner, repo, options));
          
          console.error(`[DEBUG] Issue created successfully`);
          return {
            content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
          };
        } catch (err) {
          // Type guard for Error objects
          const error = err instanceof Error ? err : new Error(String(err));
          
          console.error(`[ERROR] Failed to create issue:`, error);
          
          if (error instanceof GitHubResourceNotFoundError) {
            throw new Error(
              `Repository '${owner}/${repo}' not found. Please verify:\n` +
              `1. The repository exists\n` +
              `2. You have correct access permissions\n` +
              `3. The owner and repository names are spelled correctly`
            );
          }
          
          // Safely access error properties
          throw new Error(
            `Failed to create issue: ${error.message}${
              error.stack ? `\nStack: ${error.stack}` : ''
            }`
          );
        }
      }

      case "create_pull_request": {
        const args = pulls.CreatePullRequestSchema.parse(request.params.arguments);
        const pullRequest = await withToken(() => pulls.createPullRequest(args));
        return {
          content: [{ type: "text", text: JSON.stringify(pullRequest, null, 2) }],
        };
      }

      case "search_code": {
        const args = search.SearchCodeSchema.parse(request.params.arguments);
        const results = await withToken(() => search.searchCode(args));
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "search_issues": {
        const args = search.SearchIssuesSchema.parse(request.params.arguments);
        const results = await withToken(() => search.searchIssues(args));
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "search_users": {
        const args = search.SearchUsersSchema.parse(request.params.arguments);
        const results = await withToken(() => search.searchUsers(args));
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "list_issues": {
        const args = issues.ListIssuesOptionsSchema.parse(request.params.arguments);
        const { owner, repo, ...options } = args;
        const result = await withToken(() => issues.listIssues(owner, repo, options));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "update_issue": {
        const args = issues.UpdateIssueOptionsSchema.parse(request.params.arguments);
        const { owner, repo, issue_number, ...options } = args;
        const result = await withToken(() => issues.updateIssue(owner, repo, issue_number, options));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "add_issue_comment": {
        const args = issues.IssueCommentSchema.parse(request.params.arguments);
        const { owner, repo, issue_number, body } = args;
        const result = await withToken(() => issues.addIssueComment(owner, repo, issue_number, body));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "list_commits": {
        const args = commits.ListCommitsSchema.parse(request.params.arguments);
        const results = await withToken(() => commits.listCommits(
          args.owner,
          args.repo,
          args.page,
          args.perPage,
          args.sha
        ));
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "get_issue": {
        const args = issues.GetIssueSchema.parse(request.params.arguments);
        const issue = await withToken(() => issues.getIssue(args.owner, args.repo, args.issue_number));
        return {
          content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
        };
      }

      case "get_pull_request": {
        const args = pulls.GetPullRequestSchema.parse(request.params.arguments);
        const pullRequest = await withToken(() => pulls.getPullRequest(args.owner, args.repo, args.pull_number));
        return {
          content: [{ type: "text", text: JSON.stringify(pullRequest, null, 2) }],
        };
      }

      case "list_pull_requests": {
        const args = pulls.ListPullRequestsSchema.parse(request.params.arguments);
        const { owner, repo, ...options } = args;
        const pullRequests = await withToken(() => pulls.listPullRequests(owner, repo, options));
        return {
          content: [{ type: "text", text: JSON.stringify(pullRequests, null, 2) }],
        };
      }

      case "create_pull_request_review": {
        const args = pulls.CreatePullRequestReviewSchema.parse(request.params.arguments);
        const { owner, repo, pull_number, ...options } = args;
        const review = await withToken(() => pulls.createPullRequestReview(owner, repo, pull_number, options));
        return {
          content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
        };
      }

      case "merge_pull_request": {
        const args = pulls.MergePullRequestSchema.parse(request.params.arguments);
        const { owner, repo, pull_number, ...options } = args;
        const result = await withToken(() => pulls.mergePullRequest(owner, repo, pull_number, options));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_pull_request_files": {
        const args = pulls.GetPullRequestFilesSchema.parse(request.params.arguments);
        const files = await withToken(() => pulls.getPullRequestFiles(args.owner, args.repo, args.pull_number));
        return {
          content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
        };
      }

      case "get_pull_request_status": {
        const args = pulls.GetPullRequestStatusSchema.parse(request.params.arguments);
        const status = await withToken(() => pulls.getPullRequestStatus(args.owner, args.repo, args.pull_number));
        return {
          content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
        };
      }

      case "update_pull_request_branch": {
        const args = pulls.UpdatePullRequestBranchSchema.parse(request.params.arguments);
        const { owner, repo, pull_number, expected_head_sha } = args;
        await withToken(() => pulls.updatePullRequestBranch(owner, repo, pull_number, expected_head_sha));
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }],
        };
      }

      case "get_pull_request_comments": {
        const args = pulls.GetPullRequestCommentsSchema.parse(request.params.arguments);
        const comments = await withToken(() => pulls.getPullRequestComments(args.owner, args.repo, args.pull_number));
        return {
          content: [{ type: "text", text: JSON.stringify(comments, null, 2) }],
        };
      }

      case "get_pull_request_reviews": {
        const args = pulls.GetPullRequestReviewsSchema.parse(request.params.arguments);
        const reviews = await withToken(() => pulls.getPullRequestReviews(args.owner, args.repo, args.pull_number));
        return {
          content: [{ type: "text", text: JSON.stringify(reviews, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isGitHubError(error)) {
      throw new Error(formatGitHubError(error));
    }
    throw error;
  }
});

async function runServer() {
  const app = express();
  let transport: SSEServerTransport | undefined;

  app.get("/sse", async (req: ExpressRequest, res: ExpressResponse) => {
    console.error("Received SSE connection");
    
    // Get token and encryption key from query parameters
    const token = req.query.token as string | undefined;
    const encryptionKey = req.query.encryption_key as string | undefined;
    const isEncrypted = req.query.encrypted === 'true';
    
    if (token) {
      try {
        if (isEncrypted) {
          // Handle encrypted token
          console.error("Encrypted access token received from client");
          
          // Get encryption key from query parameter or environment variable
          const key = encryptionKey || process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
          
          if (!key) {
            console.error("ERROR: Encryption key not provided for encrypted token");
            res.status(400).json({ 
              error: "Encryption key required for encrypted token. Provide 'encryption_key' query parameter or set GITHUB_TOKEN_ENCRYPTION_KEY environment variable." 
            });
            return;
          }
          
          // Decrypt the token
          const decryptedToken = decryptToken(token, key);
          dynamicAccessToken = decryptedToken;
          console.error("Access token successfully decrypted");
        } else {
          // Handle plain text token
          console.error("Plain text access token received from client");
          dynamicAccessToken = token;
        }
      } catch (error) {
        console.error("ERROR: Failed to process token:", error);
        res.status(400).json({ 
          error: `Failed to process token: ${error instanceof Error ? error.message : String(error)}` 
        });
        return;
      }
    } else {
      console.error("No access token provided by client, will use environment variable if available");
      dynamicAccessToken = null;
    }

    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);

    server.onclose = async () => {
      await server.close();
    };
  });

  app.post("/message", async (req: ExpressRequest, res: ExpressResponse) => {
    console.error("Received message");
    if (!transport) {
      console.error("ERROR: SSE connection not established");
      res.status(500).json({ error: "SSE connection not established" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  // Handle cleanup on server shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  // Use port 9000 as specified
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => {
    console.error(`GitHub MCP Server running on port ${PORT}`);
  });
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
