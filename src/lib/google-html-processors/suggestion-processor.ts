import { visit } from 'unist-util-visit';
import type { Node, Element } from 'hast';
import { BaseProcessor } from './base-processor';
import { isSuggestion, isElement, hasChildren } from '../type-guards';

/**
 * Process Google Docs suggestions based on the configured mode.
 * Suggestions can be shown, hidden, accepted, or rejected.
 */
export class SuggestionProcessor extends BaseProcessor {
  process(tree: Node): void {
    const mode = this.options.suggestions || 'show';
    
    switch (mode) {
      case 'hide':
        this.hideSuggestions(tree);
        break;
      case 'accept':
        this.acceptSuggestions(tree);
        break;
      case 'reject':
        this.rejectSuggestions(tree);
        break;
      case 'show':
      default:
        // Keep suggestions as-is
        break;
    }
  }

  private hideSuggestions(node: Node): void {
    visit(node, isSuggestion, (suggestionNode, index, parent) => {
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1);
        return index;
      }
    });
  }

  private acceptSuggestions(node: Node): void {
    visit(node, isSuggestion, (suggestionNode: Element) => {
      // Remove suggestion-specific attributes
      if (suggestionNode.properties) {
        delete suggestionNode.properties.dataSuggestionId;
        delete suggestionNode.properties.dataSuggestionType;
        
        // Remove suggestion-related classes
        if (suggestionNode.properties.className) {
          const classes = Array.isArray(suggestionNode.properties.className)
            ? suggestionNode.properties.className
            : [suggestionNode.properties.className];
          
          suggestionNode.properties.className = classes.filter(
            (cls: string) => !cls.includes('suggestion')
          );
          
          if (suggestionNode.properties.className.length === 0) {
            delete suggestionNode.properties.className;
          }
        }
      }
    });
  }

  private rejectSuggestions(node: Node): void {
    visit(node, isSuggestion, (suggestionNode: Element, index, parent) => {
      if (parent && typeof index === 'number') {
        const suggestionType = suggestionNode.properties?.dataSuggestionType;
        
        if (suggestionType === 'insertion') {
          // Remove inserted content
          parent.children.splice(index, 1);
          return index;
        } else if (suggestionType === 'deletion') {
          // Keep deleted content but remove suggestion markup
          if (suggestionNode.properties) {
            delete suggestionNode.properties.dataSuggestionId;
            delete suggestionNode.properties.dataSuggestionType;
            
            // Remove suggestion-related classes
            if (suggestionNode.properties.className) {
              const classes = Array.isArray(suggestionNode.properties.className)
                ? suggestionNode.properties.className
                : [suggestionNode.properties.className];
              
              suggestionNode.properties.className = classes.filter(
                (cls: string) => !cls.includes('suggestion')
              );
              
              if (suggestionNode.properties.className.length === 0) {
                delete suggestionNode.properties.className;
              }
            }
          }
        }
      }
    });
  }
}