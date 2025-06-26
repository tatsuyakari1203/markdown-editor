/**
 * Light-Weight CSS Tooling
 *
 * The code here is meant to be a pretty light-weight and minimal approach to
 * CSS handling that meets the needs of the rest of the GDoc2Md library. It is
 * not meant to apply much validation or strictness to the CSS it handles, or
 * to handle particularly complex CSS content that we don't expect to see from
 * Google Docs.
 *
 * If our needs get drastically more complex in the future, we should switch to
 * using a dedicated third-party CSS parser like css-tree or postcss.
 */

import type { Element } from 'hast';

// Type definitions
export interface Style {
  [property: string]: string;
}

// Extended Element type with cached style properties
export interface ElementWithStyle extends Element {
  _style?: Style;
  _resolvedStyle?: Style;
}

/**
 * Check whether a string is empty or only contains whitespace.
 */
function isBlank(text: string): boolean {
  return /^\s*$/.test(text);
}

/**
 * Parse a CSS property list (e.g. from an HTML `style` attribute) into a simple
 * object where the keys are the property names and the values are the property
 * values (as strings).
 * Value strings are lower-cased for easier handling (since most CSS values are
 * case insensitive), but this doesn't break out individual properties from
 * shorthand properties or do other specialized property/value handling.
 */
export function parseCssPropertyList(text: string): Style {
  const properties: Style = Object.create(null);
  if (!text) return properties;

  // This is pretty simplistic, and there are significant caveats:
  // - The semicolon could be inside a quoted string, in which case it shouldn't
  //   split properties.
  // - The property names and values are not limited to the actual allowed
  //   characters (the rules used here are much simpler than in real CSS).
  //
  // For the most part, this library doesn't need to be too concerned with
  // invalid input. We expect to be working with valid HTML & CSS that was
  // output by Google Docs. We haven't seen content that violates the above
  // caveats, so this is OK for now, but that could potentially change.
  for (const property of text.split(';')) {
    if (isBlank(property)) continue;

    try {
      const match = property.match(
        /^\s*(?<name>[\w-]+)\s*:\s*(?<value>.+)\s*$/
      );
      
      if (!match?.groups) {
        throw new Error('Invalid CSS property format');
      }
      
      const { name, value } = match.groups;
      // Lower-case values for easier lookups and comparisons. Technically this
      // should only happen for parts of the value that are not quoted.
      properties[name] = value.toLowerCase();
    } catch (error) {
      console.warn(`Could not parse CSS property "${property}" (${error})`);
    }
  }

  return properties;
}

/**
 * Get the content of the node's `style` attribute as a parsed object. This
 * caches the results on the node for easy retrieval.
 */
function getNodeStyle(node: ElementWithStyle): Style {
  if (!node._style) {
    const styleAttr = node.properties?.style;
    node._style = parseCssPropertyList(typeof styleAttr === 'string' ? styleAttr : '');
  }
  return node._style;
}

/**
 * Resolve the actual, inherited value of a single style property based on the
 * whole tree of nodes. This caches results on the node for easy retrieval.
 */
function getResolvedStyleProperty(
  propertyName: string,
  node: ElementWithStyle,
  ancestors?: ElementWithStyle[]
): string | undefined {
  if (!node._resolvedStyle) {
    node._resolvedStyle = Object.create(null);
  }
  
  if (propertyName in node._resolvedStyle) {
    return node._resolvedStyle[propertyName];
  }

  let value = getNodeStyle(node)[propertyName];
  if ((value && value !== 'inherit') || !ancestors?.length) {
    node._resolvedStyle[propertyName] = value;
    return value;
  }

  // WARNING: Not all properties are inheritable, but this code doesn't check
  // for inheritability. If it turns out we need to do so, MDN has nice data
  // to build an allow/block-list from:
  // https://github.com/mdn/data/blob/main/css/properties.json
  const parentAncestors = ancestors.slice(0, -1);
  const parent = ancestors[ancestors.length - 1];
  
  if (!parent) {
    node._resolvedStyle[propertyName] = value;
    return value;
  }
  
  const resolvedValue = getResolvedStyleProperty(propertyName, parent, parentAncestors);
  node._resolvedStyle[propertyName] = resolvedValue;
  return resolvedValue;
}

/**
 * Get an object with properties representing a node's fully resolved styles,
 * including anything inherited from ancestors.
 */
export function resolveNodeStyle(
  node: ElementWithStyle,
  ancestors: ElementWithStyle[]
): Style {
  return new Proxy(Object.create(null), {
    get(target: Style, property: string | symbol): string | undefined {
      if (typeof property !== 'string') {
        return undefined;
      }
      
      if (!(property in target)) {
        target[property] = getResolvedStyleProperty(property, node, ancestors);
      }
      return target[property];
    },
  });
}