"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeSnippet, SupportedLanguage } from "@/components/developers/code-snippet";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface APIHeader {
  name: string;
  required: boolean;
  description: string;
  example: string;
}

export interface APIEndpoint {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Endpoint path */
  path: string;
  /** Short description */
  summary: string;
  /** Detailed description */
  description: string;
  /** Request headers */
  headers?: APIHeader[];
  /** Path parameters */
  pathParams?: APIParameter[];
  /** Query parameters */
  queryParams?: APIParameter[];
  /** Request body parameters */
  bodyParams?: APIParameter[];
  /** Example request body */
  requestExample?: Record<string, unknown>;
  /** Example response body */
  responseExample?: Record<string, unknown>;
  /** Possible error responses */
  errorResponses?: {
    status: number;
    code: string;
    description: string;
  }[];
}

interface APIEndpointDocProps {
  endpoint: APIEndpoint;
  apiKey?: string;
  languages?: SupportedLanguage[];
  defaultExpanded?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  POST: "bg-green-500/10 text-green-600 border-green-500/20",
  PUT: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

function ParameterTable({ 
  title, 
  parameters 
}: { 
  title: string; 
  parameters: APIParameter[];
}) {
  if (!parameters || parameters.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Required</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {parameters.map((param) => (
              <tr key={param.name}>
                <td className="px-4 py-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    {param.name}
                  </code>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  <code className="text-xs">{param.type}</code>
                </td>
                <td className="px-4 py-2">
                  {param.required ? (
                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {param.description}
                  {param.example && (
                    <span className="block text-xs mt-0.5">
                      Example: <code className="bg-muted px-1 rounded">{param.example}</code>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeadersTable({ headers }: { headers?: APIHeader[] }) {
  if (!headers || headers.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">Headers</h4>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Required</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
              <th className="text-left px-4 py-2 font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {headers.map((header) => (
              <tr key={header.name}>
                <td className="px-4 py-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    {header.name}
                  </code>
                </td>
                <td className="px-4 py-2">
                  {header.required ? (
                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{header.description}</td>
                <td className="px-4 py-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    {header.example}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function APIEndpointDoc({
  endpoint,
  apiKey,
  languages = ["curl", "javascript", "python", "php", "go"],
  defaultExpanded = false,
}: APIEndpointDocProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn("font-mono text-xs px-2 py-0.5", METHOD_COLORS[endpoint.method])}
            >
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono font-medium">{endpoint.path}</code>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {endpoint.summary}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              {isExpanded ? (
                <IconChevronUp className="size-4" />
              ) : (
                <IconChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground sm:hidden mt-2">
          {endpoint.summary}
        </p>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="border-t space-y-6 pt-6">
              {/* Description */}
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {endpoint.description}
                </p>
              </div>

              {/* Headers */}
              <HeadersTable headers={endpoint.headers} />

              {/* Path Parameters */}
              <ParameterTable 
                title="Path Parameters" 
                parameters={endpoint.pathParams || []} 
              />

              {/* Query Parameters */}
              <ParameterTable 
                title="Query Parameters" 
                parameters={endpoint.queryParams || []} 
              />

              {/* Body Parameters */}
              <ParameterTable 
                title="Request Body" 
                parameters={endpoint.bodyParams || []} 
              />

              {/* Code Examples */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Code Examples</h4>
                <CodeSnippet
                  endpoint={endpoint.path}
                  method={endpoint.method}
                  body={endpoint.requestExample}
                  apiKey={apiKey}
                  languages={languages}
                />
              </div>

              {/* Response Example */}
              {endpoint.responseExample && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Response Example</h4>
                  <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
                    <pre className="text-sm text-zinc-300 font-mono">
                      {JSON.stringify(endpoint.responseExample, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Responses */}
              {endpoint.errorResponses && endpoint.errorResponses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Error Responses</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-left px-4 py-2 font-medium">Code</th>
                          <th className="text-left px-4 py-2 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {endpoint.errorResponses.map((error) => (
                          <tr key={error.code}>
                            <td className="px-4 py-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px]",
                                  error.status >= 500 
                                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                                    : error.status >= 400
                                    ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                    : ""
                                )}
                              >
                                {error.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {error.code}
                              </code>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {error.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
