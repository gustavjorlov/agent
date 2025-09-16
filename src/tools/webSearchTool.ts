// Backwards compatibility shim: webSearchTool has been renamed to urlFetchTool.
// This file re-exports the new implementation so older imports still function.
export { urlFetchTool as webSearchTool } from './urlFetchTool.js';
