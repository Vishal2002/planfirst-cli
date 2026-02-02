/**
 * Parser utilities for code analysis
 */

export class Parser {
    /**
     * Extract imports from a file
     */
    static extractImports(code: string, language: string): string[] {
      const imports: string[] = [];
  
      if (language === 'javascript' || language === 'typescript') {
        // Match import statements
        const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
        let match;
        while ((match = importRegex.exec(code)) !== null) {
          imports.push(match[1]);
        }
  
        // Match require statements
        const requireRegex = /require\(['"](.+?)['"]\)/g;
        while ((match = requireRegex.exec(code)) !== null) {
          imports.push(match[1]);
        }
      }
  
      return imports;
    }
  
    /**
     * Extract exports from a file
     */
    static extractExports(code: string, language: string): string[] {
      const exports: string[] = [];
  
      if (language === 'javascript' || language === 'typescript') {
        // Match export statements
        const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
        let match;
        while ((match = exportRegex.exec(code)) !== null) {
          exports.push(match[1]);
        }
      }
  
      return exports;
    }
  
    /**
     * Count functions in code
     */
    static countFunctions(code: string, language: string): number {
      if (language === 'javascript' || language === 'typescript') {
        const functionRegex = /function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g;
        const matches = code.match(functionRegex);
        return matches ? matches.length : 0;
      }
      return 0;
    }
  }