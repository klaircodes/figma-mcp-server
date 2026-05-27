"use strict";
(() => {
  // main/serialization/serialization.ts
  function serializeNode(node, visited = /* @__PURE__ */ new Set()) {
    if (visited.has(node.id)) {
      return { id: node.id, _circular: true };
    }
    visited.add(node.id);
    const result = {};
    let current = node;
    const allProps = /* @__PURE__ */ new Set();
    while (current && current !== Object.prototype) {
      Object.getOwnPropertyNames(current).forEach((prop) => {
        if (!prop.startsWith("__")) {
          allProps.add(prop);
        }
      });
      current = Object.getPrototypeOf(current);
    }
    allProps.forEach((prop) => {
      if (prop === "parent" || prop === "removed" || prop === "instances" || prop === "mainComponent" || prop === "masterComponent" || typeof node[prop] === "function") {
        return;
      }
      if (prop === "children") {
        result[prop] = node[prop].map((child) => {
          return {
            id: child.id,
            name: child.name,
            type: child.type
          };
        });
        return;
      }
      try {
        const value = node[prop];
        if (value === void 0 || value === null) {
          return;
        }
        if (value === figma.mixed) {
          return;
        }
        if (typeof value === "object") {
          if (Array.isArray(value)) {
            result[prop] = value.map((item) => {
              if (item && typeof item === "object" && "id" in item) {
                return serializeNode(item, visited);
              }
              return item;
            });
          } else if ("id" in value && typeof value.id === "string") {
            result[prop] = { id: value.id };
          } else {
            try {
              result[prop] = JSON.parse(JSON.stringify(value));
            } catch (error) {
              result[prop] = String(value);
            }
          }
        } else {
          result[prop] = value;
        }
      } catch (error) {
        void error;
      }
    });
    return result;
  }

  // main/tools/read/get-node-info.ts
  async function getNodeInfo(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (node) {
      const serializedNode = serializeNode(node);
      return {
        isError: false,
        content: serializedNode
      };
    }
    return {
      isError: true,
      content: "Node not found"
    };
  }

  // main/serialization/serialize-component.ts
  function serializeComponent(component) {
    const properties = component.componentPropertyDefinitions;
    return JSON.stringify({
      id: component.id,
      name: component.name,
      key: component.key,
      properties
    });
  }

  // main/tools/read/get-all-components.ts
  async function getAllComponents(args) {
    await figma.loadAllPagesAsync();
    const components = figma.root.findAllWithCriteria({
      types: ["COMPONENT", "COMPONENT_SET"]
    });
    if (components.length === 0) {
      return {
        isError: false,
        content: "No components found"
      };
    }
    const serializedComponents = components.map(
      (component) => serializeComponent(component)
    );
    return {
      isError: false,
      content: serializedComponents
    };
  }

  // main/serialization/serialize-rectangle.ts
  function serializeRectangle(rectangle) {
    return JSON.stringify({
      id: rectangle.id,
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height,
      name: rectangle.name,
      parentId: rectangle.parent ? `${rectangle.parent.id}:${rectangle.parent.type}` : void 0
    });
  }

  // main/tools/create/create-rectangle.ts
  async function createRectangle(args) {
    const rectangle = figma.createRectangle();
    rectangle.x = args.x;
    rectangle.y = args.y;
    rectangle.resize(args.width, args.height);
    rectangle.name = args.name;
    if (args.parentId) {
      const parent = await figma.getNodeByIdAsync(args.parentId);
      if (parent) {
        parent.appendChild(rectangle);
      } else {
        return {
          isError: true,
          content: "Parent node not found"
        };
      }
    } else {
      figma.currentPage.appendChild(rectangle);
    }
    return {
      isError: false,
      content: serializeRectangle(rectangle)
    };
  }

  // main/tools/safe-tool-processor.ts
  function safeToolProcessor(tool) {
    return async (args) => {
      try {
        return await tool(args);
      } catch (error) {
        console.error(error);
        return {
          isError: true,
          content: error instanceof Error ? error.message : JSON.stringify(error)
        };
      }
    };
  }

  // node_modules/@create-figma-plugin/utilities/lib/events.js
  var eventHandlers = {};
  var currentId = 0;
  function on(name, handler) {
    const id = `${currentId}`;
    currentId += 1;
    eventHandlers[id] = { handler, name };
    return function() {
      delete eventHandlers[id];
    };
  }
  var emit = typeof window === "undefined" ? function(name, ...args) {
    figma.ui.postMessage([name, ...args]);
  } : function(name, ...args) {
    window.parent.postMessage({
      pluginMessage: [name, ...args]
    }, "*");
  };
  function invokeEventHandler(name, args) {
    let invoked = false;
    for (const id in eventHandlers) {
      if (eventHandlers[id].name === name) {
        eventHandlers[id].handler.apply(null, args);
        invoked = true;
      }
    }
    if (invoked === false) {
      throw new Error(`No event handler with name \`${name}\``);
    }
  }
  if (typeof window === "undefined") {
    figma.ui.onmessage = function(args) {
      if (!Array.isArray(args)) {
        return;
      }
      const [name, ...rest] = args;
      if (typeof name !== "string") {
        return;
      }
      invokeEventHandler(name, rest);
    };
  } else {
    window.onmessage = function(event) {
      if (typeof event.data.pluginMessage === "undefined") {
        return;
      }
      const args = event.data.pluginMessage;
      if (!Array.isArray(args)) {
        return;
      }
      const [name, ...rest] = event.data.pluginMessage;
      if (typeof name !== "string") {
        return;
      }
      invokeEventHandler(name, rest);
    };
  }

  // main/tools/read/get-selection.ts
  async function getSelection(args) {
    const selection = figma.currentPage.selection;
    if (selection) {
      const serializedSelection = selection.map((node) => serializeNode(node));
      return {
        isError: false,
        content: serializedSelection
      };
    }
    return { isError: true, content: "Selection not found" };
  }

  // main/tools/update/move-node.ts
  async function moveNode(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    const sceneNode = node;
    sceneNode.x = args.x;
    sceneNode.y = args.y;
    return { isError: false, content: serializeNode(sceneNode) };
  }

  // main/tools/update/resize-node.ts
  async function resizeNode(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    node.resize(args.width, args.height);
    return { isError: false, content: serializeNode(node) };
  }

  // main/tools/delete/delete-node.ts
  async function deleteNode(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    const name = node.name;
    node.remove();
    return { isError: false, content: `Node "${name}" (${args.id}) deleted successfully` };
  }

  // main/tools/create/clone-node.ts
  async function cloneNode(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    const sceneNode = node;
    const clonedNode = sceneNode.clone();
    clonedNode.name = sceneNode.name;
    return { isError: false, content: serializeNode(clonedNode) };
  }

  // main/serialization/serialize-scene-node.ts
  function serializeSceneNode(sceneNode) {
    return JSON.stringify({
      id: sceneNode.id,
      x: sceneNode.x,
      y: sceneNode.y,
      width: sceneNode.width,
      height: sceneNode.height,
      name: sceneNode.name,
      parentId: sceneNode.parent ? `${sceneNode.parent.id}:${sceneNode.parent.type}` : void 0
    });
  }

  // main/serialization/serialize-frame.ts
  function serializeFrame(frame) {
    return serializeSceneNode(frame);
  }

  // main/tools/create/create-frame.ts
  async function createFrame(args) {
    const frame = figma.createFrame();
    frame.x = args.x;
    frame.y = args.y;
    frame.resize(args.width, args.height);
    frame.name = args.name;
    if (args.parentId) {
      const parent = await figma.getNodeByIdAsync(args.parentId);
      if (parent) {
        parent.appendChild(frame);
      } else {
        return {
          isError: true,
          content: "Parent node not found"
        };
      }
    } else {
      figma.currentPage.appendChild(frame);
    }
    return {
      isError: false,
      content: serializeFrame(frame)
    };
  }

  // main/utils/get-font-style.ts
  function getFontStyle(fontWeight) {
    switch (fontWeight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  }

  // main/utils/color-conversion.ts
  function convertToRGBA(color) {
    const match = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    let [r, g, b, a] = ["00", "00", "00", "FF"];
    if (match) {
      [r, g, b, a] = match.slice(1);
    }
    return {
      r: parseInt(r, 16) / 255,
      g: parseInt(g, 16) / 255,
      b: parseInt(b, 16) / 255,
      a: parseInt(a, 16) / 255
    };
  }
  function convertToHex(color) {
    const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
    const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
    const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
    const a = color.a ? Math.round(color.a * 255).toString(16).padStart(2, "0") : "FF";
    return `#${r}${g}${b}${a}`;
  }

  // main/utils/get-solid-color-paint.ts
  function getSolidColorPaint(color) {
    return {
      type: "SOLID",
      color: {
        r: color.r,
        g: color.g,
        b: color.b
      },
      opacity: color.a || 1
    };
  }
  function getSolidHEXColorPaint(color) {
    const rgba = convertToRGBA(color);
    return getSolidColorPaint(rgba);
  }

  // main/serialization/serialize-fill.ts
  function serializeFill(fill) {
    if (!Array.isArray(fill)) {
      return "";
    }
    const result = fill.map((item) => {
      if (item.type === "SOLID") {
        return {
          type: "SOLID",
          color: convertToHex(item.color)
        };
      }
      return JSON.stringify(item);
    });
    return JSON.stringify(result);
  }

  // main/serialization/serialize-text.ts
  function serializeText(text) {
    return JSON.stringify({
      id: text.id,
      x: text.x,
      y: text.y,
      width: text.width,
      height: text.height,
      name: text.name,
      fontSize: text.fontSize,
      fontName: text.fontName,
      fontColor: serializeFill(text.fills),
      parentId: text.parent ? `${text.parent.id}:${text.parent.type}` : void 0
    });
  }

  // main/tools/create/create-text.ts
  async function createText(args) {
    const text = figma.createText();
    text.x = args.x;
    text.y = args.y;
    try {
      console.log("Setting font color", args.fontColor);
      console.log("getSolidHEXColorPaint", getSolidHEXColorPaint(args.fontColor));
      text.fills = [getSolidHEXColorPaint(args.fontColor)];
    } catch (error) {
      return {
        isError: true,
        content: `Error setting font color: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      };
    }
    try {
      await figma.loadFontAsync({
        family: args.fontName,
        style: getFontStyle(args.fontWeight)
      });
      text.fontName = { family: args.fontName, style: getFontStyle(args.fontWeight) };
    } catch (error) {
      return {
        isError: true,
        content: `Error loading font "${args.fontName}" with style "${getFontStyle(args.fontWeight)}": ${error instanceof Error ? error.message : JSON.stringify(error)}`
      };
    }
    text.fontSize = args.fontSize;
    text.name = args.name;
    text.characters = args.text;
    if (args.parentId) {
      const parent = await figma.getNodeByIdAsync(args.parentId);
      if (parent) {
        parent.appendChild(text);
      } else {
        return { isError: true, content: "Parent node not found" };
      }
    }
    return { isError: false, content: serializeText(text) };
  }

  // main/tools/update/set-fill-color.ts
  async function setFillColor(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    try {
      if ("fills" in node) {
        node.fills = [getSolidHEXColorPaint(args.color)];
      } else {
        return { isError: true, content: "Node does not have a fills property" };
      }
    } catch (error) {
      return { isError: true, content: `Error setting fill color: ${error instanceof Error ? error.message : JSON.stringify(error)}` };
    }
    return { isError: false, content: serializeNode(node) };
  }

  // main/tools/update/set-stroke-color.ts
  async function setStrokeColor(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    try {
      if ("strokes" in node) {
        node.strokes = [getSolidHEXColorPaint(args.color)];
      } else {
        return { isError: true, content: "Node does not have a strokes property" };
      }
    } catch (error) {
      return { isError: true, content: `Error setting stroke color: ${error instanceof Error ? error.message : JSON.stringify(error)}` };
    }
    return { isError: false, content: serializeNode(node) };
  }

  // main/tools/update/set-corner-radius.ts
  async function setCornerRadius(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    try {
      if ("cornerRadius" in node) {
        node.cornerRadius = args.cornerRadius;
      }
      if ("topLeftRadius" in node && args.topLeftRadius) {
        node.topLeftRadius = args.topLeftRadius;
      }
      if ("topRightRadius" in node && args.topRightRadius) {
        node.topRightRadius = args.topRightRadius;
      }
      if ("bottomLeftRadius" in node && args.bottomLeftRadius) {
        node.bottomLeftRadius = args.bottomLeftRadius;
      }
      if ("bottomRightRadius" in node && args.bottomRightRadius) {
        node.bottomRightRadius = args.bottomRightRadius;
      }
    } catch (error) {
      return { isError: true, content: `Error setting corner radius: ${error instanceof Error ? error.message : JSON.stringify(error)}` };
    }
    const sceneNode = node;
    return { isError: false, content: serializeNode(sceneNode) };
  }

  // main/tools/update/set-layout.ts
  async function setLayout(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    let errorMessage = "";
    if (args.mode) {
      if ("layoutMode" in node) {
        node.layoutMode = args.mode;
      } else {
        errorMessage += "Node does not have a layoutMode property\n";
      }
    }
    if (args.wrap) {
      if ("layoutWrap" in node) {
        node.layoutWrap = args.wrap ? "WRAP" : "NO_WRAP";
      } else {
        errorMessage += "Node does not have a layoutWrap property\n";
      }
    }
    if (args.clip) {
      if ("clipContent" in node) {
        node.clipContent = args.clip;
      } else {
        errorMessage += "Node does not have a clipContent property\n";
      }
    }
    if (args.mode === "HORIZONTAL" || args.mode === "VERTICAL") {
      if (args.itemSpacing) {
        if ("itemSpacing" in node) {
          node.itemSpacing = args.itemSpacing;
        } else {
          errorMessage += "Node does not have a itemSpacing property\n";
        }
      }
      if (args.primaryAxisAlignItems) {
        if ("primaryAxisAlignItems" in node) {
          node.primaryAxisAlignItems = args.primaryAxisAlignItems;
        } else {
          errorMessage += "Node does not have a primaryAxisAlignItems property\n";
        }
      }
      if (args.counterAxisAlignItems) {
        if ("counterAxisAlignItems" in node) {
          node.counterAxisAlignItems = args.counterAxisAlignItems;
        } else {
          errorMessage += "Node does not have a counterAxisAlignItems property\n";
        }
      }
    }
    if (args.paddingLeft) {
      if ("paddingLeft" in node) {
        node.paddingLeft = args.paddingLeft;
      } else {
        errorMessage += "Node does not have a paddingLeft property\n";
      }
    }
    if (args.paddingRight) {
      if ("paddingRight" in node) {
        node.paddingRight = args.paddingRight;
      } else {
        errorMessage += "Node does not have a paddingRight property\n";
      }
    }
    if (args.paddingTop) {
      if ("paddingTop" in node) {
        node.paddingTop = args.paddingTop;
      } else {
        errorMessage += "Node does not have a paddingTop property\n";
      }
    }
    if (args.paddingBottom) {
      if ("paddingBottom" in node) {
        node.paddingBottom = args.paddingBottom;
      } else {
        errorMessage += "Node does not have a paddingBottom property\n";
      }
    }
    if (args.layoutSizingVertical) {
      if ("layoutSizingVertical" in node) {
        node.layoutSizingVertical = args.layoutSizingVertical;
      } else {
        errorMessage += "Node does not have a layoutSizingVertical property\n";
      }
    }
    if (args.layoutSizingHorizontal) {
      if ("layoutSizingHorizontal" in node) {
        node.layoutSizingHorizontal = args.layoutSizingHorizontal;
      } else {
        errorMessage += "Node does not have a layoutSizingHorizontal property\n";
      }
    }
    if (errorMessage.length > 0) {
      return { isError: true, content: errorMessage };
    }
    return {
      isError: false,
      content: serializeNode(node)
    };
  }

  // main/serialization/serialize-instanse.ts
  function serializeInstance(instance) {
    const properties = instance.componentProperties;
    return JSON.stringify({
      id: instance.id,
      name: instance.name,
      x: instance.x,
      y: instance.y,
      parentId: instance.parent ? `${instance.parent.id}` : void 0,
      properties
    });
  }

  // main/tools/create/create-instance.ts
  async function createInstance(args) {
    const component = await figma.getNodeByIdAsync(args.componentId);
    if (!component) {
      return {
        isError: true,
        content: "Component not found"
      };
    }
    const instance = component.createInstance();
    instance.name = args.name;
    instance.x = args.x;
    instance.y = args.y;
    if (args.parentId) {
      const parent = await figma.getNodeByIdAsync(args.parentId);
      if (!parent) {
        return {
          isError: true,
          content: "Parent node not found"
        };
      }
    } else {
      figma.currentPage.appendChild(instance);
    }
    return {
      isError: false,
      content: serializeInstance(instance)
    };
  }

  // main/tools/create/add-component-property.ts
  async function addComponentProperty(args) {
    const component = await figma.getNodeByIdAsync(args.componentId);
    if (!component) {
      return { isError: true, content: "Component not found" };
    }
    if (!(component.type === "COMPONENT")) {
      return { isError: true, content: "Node is not a component" };
    }
    const componentNode = component;
    const property = {
      name: args.name,
      type: args.type,
      defaultValue: args.type === "BOOLEAN" ? Boolean(args.defaultValue) : args.defaultValue
    };
    componentNode.addComponentProperty(property.name, property.type, property.defaultValue);
    return { isError: false, content: "Component properties added successfully" };
  }

  // main/tools/update/edit-component-property.ts
  async function editComponentProperty(args) {
    const component = await figma.getNodeByIdAsync(args.componentId);
    if (!component) {
      return { isError: true, content: "Component not found" };
    }
    if (!(component.type === "COMPONENT")) {
      return { isError: true, content: "Node is not a component" };
    }
    const componentNode = component;
    let preferredValues = [];
    if (args.type === "INSTANCE_SWAP") {
      if (!args.preferredValues) {
        return { isError: true, content: "Preferred values are required for instance swap property" };
      }
      preferredValues = args.preferredValues.map((value) => ({
        type: "COMPONENT",
        key: value
      })) || [];
    }
    const propertyType = args.type;
    const componentProperty = componentNode.editComponentProperty(args.name, {
      name: args.name,
      defaultValue: args.defaultValue,
      preferredValues
    });
    return { isError: false, content: componentProperty };
  }

  // main/tools/delete/delete-component-property.ts
  async function deleteComponentProperty(args) {
    const component = await figma.getNodeByIdAsync(args.componentId);
    if (!component) {
      return { isError: true, content: "Component not found" };
    }
    if (!(component.type === "COMPONENT")) {
      return { isError: true, content: "Node is not a component" };
    }
    const componentNode = component;
    componentNode.deleteComponentProperty(args.name);
    return { isError: false, content: "Component property deleted successfully" };
  }

  // main/tools/update/set-instance-properties.ts
  async function setInstanceProperties(args) {
    const instance = await figma.getNodeByIdAsync(args.instanceId);
    if (!instance) {
      return { isError: true, content: "Instance not found" };
    }
    if (!(instance.type === "INSTANCE")) {
      return { isError: true, content: "Node is not an instance" };
    }
    const instanceNode = instance;
    instanceNode.setProperties(args.properties);
    const updatedInstance = await figma.getNodeByIdAsync(args.instanceId);
    return { isError: false, content: serializeInstance(updatedInstance) };
  }

  // main/tools/update/set-node-component-property-references.ts
  async function setNodeComponentPropertyReferences(args) {
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    const sceneNode = node;
    sceneNode.componentPropertyReferences = args.componentPropertyReferences;
    const updatedNode = await figma.getNodeByIdAsync(args.id);
    return { isError: false, content: serializeNode(updatedNode) };
  }

  // main/tools/create/create-component.ts
  async function createComponent(args) {
    const component = figma.createComponent();
    component.name = args.name;
    if (args.parentId) {
      const parent = await figma.getNodeByIdAsync(args.parentId);
      if (parent) {
        parent.appendChild(component);
      } else {
        return { isError: true, content: "Parent node not found" };
      }
    }
    return { isError: false, content: serializeComponent(component) };
  }

  // main/tools/update/set-parent-id.ts
  async function setParentId(args) {
    await figma.loadAllPagesAsync();
    const node = await figma.getNodeByIdAsync(args.id);
    if (!node) {
      return { isError: true, content: "Node not found" };
    }
    const parent = await figma.getNodeByIdAsync(args.parentId);
    if (!parent) {
      return { isError: true, content: "Parent node not found" };
    }
    parent.appendChild(node);
    return { isError: false, content: serializeNode(node) };
  }

  // main/serialization/serialize-page.ts
  function serializePage(page) {
    return JSON.stringify({
      id: page.id,
      name: page.name,
      nodes: page.children.map((node) => serializeNode(node))
    });
  }

  // main/tools/read/get-pages.ts
  async function getPages(args) {
    await figma.loadAllPagesAsync();
    const pages = figma.root.findAllWithCriteria({
      types: ["PAGE"]
    });
    const serializedPages = pages.map((page) => serializePage(page));
    return {
      isError: false,
      content: serializedPages
    };
  }

  // main/tools/create/create-image.ts
  async function createImage(args) {
    const imageData = new Uint8Array(args.imageData);
    const image = figma.createImage(imageData);
    const node = figma.createRectangle();
    node.x = args.x;
    node.y = args.y;
    node.resize(args.width, args.height);
    node.name = args.name;
    node.fills = [
      {
        type: "IMAGE",
        imageHash: image.hash,
        scaleMode: "FILL"
      }
    ];
    if (args.parentId) {
      const parent = await figma.getNodeByIdAsync(args.parentId);
      if (parent) {
        parent.appendChild(node);
      }
    }
    return {
      isError: false,
      content: serializeRectangle(node)
    };
  }

  // main/tools/create/add-prototype-link.ts
  async function addPrototypeLink(args) {
    const sourceNode = await figma.getNodeByIdAsync(args.nodeId);
    if (!sourceNode) {
      return { isError: true, content: "Source node not found" };
    }
    const destinationNode = await figma.getNodeByIdAsync(args.destinationId);
    if (!destinationNode) {
      return { isError: true, content: "Destination node not found" };
    }
    if (!("reactions" in sourceNode)) {
      return { isError: true, content: "Source node does not support reactions" };
    }
    const sceneNode = sourceNode;
    let transition = null;
    if (args.transition !== "INSTANT") {
      const directional = ["MOVE_IN", "MOVE_OUT", "PUSH", "SLIDE_IN", "SLIDE_OUT"];
      if (directional.indexOf(args.transition) >= 0) {
        transition = {
          type: args.transition,
          direction: "LEFT",
          matchLayers: false,
          duration: args.duration / 1e3,
          easing: { type: "EASE_IN_AND_OUT" }
        };
      } else {
        transition = {
          type: args.transition,
          duration: args.duration / 1e3,
          easing: { type: "EASE_IN_AND_OUT" }
        };
      }
    }
    const actionObj = {
      type: "NODE",
      destinationId: args.destinationId,
      navigation: args.navigation,
      transition,
      resetVideoPosition: false
    };
    const reaction = {
      action: actionObj,
      actions: [actionObj],
      trigger: { type: args.trigger }
    };
    const existing = sceneNode.reactions || [];
    const existingReactions = [...existing, reaction];
    await sceneNode.setReactionsAsync(existingReactions);
    return {
      isError: false,
      content: "Prototype link added: " + sceneNode.name + " -> " + destinationNode.name
    };
  }

  // main/main.ts
  function main() {
    on("START_TASK", async function(task) {
      try {
        console.log("start-task", task);
        await figma.loadAllPagesAsync();
        let result = {
          isError: true,
          content: "Tool not found"
        };
        if (task.command === "get-selection") {
          result = await safeToolProcessor(getSelection)();
        }
        if (task.command === "get-node-info") {
          result = await safeToolProcessor(getNodeInfo)(task.args);
        }
        if (task.command === "get-all-components") {
          result = await safeToolProcessor(getAllComponents)(task.args);
        }
        if (task.command === "get-pages") {
          result = await safeToolProcessor(getPages)(task.args);
        }
        if (task.command === "create-rectangle") {
          result = await safeToolProcessor(createRectangle)(task.args);
        }
        if (task.command === "move-node") {
          result = await safeToolProcessor(moveNode)(task.args);
        }
        if (task.command === "resize-node") {
          result = await safeToolProcessor(resizeNode)(task.args);
        }
        if (task.command === "delete-node") {
          result = await safeToolProcessor(deleteNode)(task.args);
        }
        if (task.command === "clone-node") {
          result = await safeToolProcessor(cloneNode)(task.args);
        }
        if (task.command === "create-frame") {
          result = await safeToolProcessor(createFrame)(task.args);
        }
        if (task.command === "create-text") {
          result = await safeToolProcessor(createText)(task.args);
        }
        if (task.command === "create-instance") {
          result = await safeToolProcessor(createInstance)(task.args);
        }
        if (task.command === "set-fill-color") {
          result = await safeToolProcessor(setFillColor)(task.args);
        }
        if (task.command === "set-stroke-color") {
          result = await safeToolProcessor(setStrokeColor)(task.args);
        }
        if (task.command === "set-corner-radius") {
          result = await safeToolProcessor(setCornerRadius)(task.args);
        }
        if (task.command === "set-layout") {
          result = await safeToolProcessor(setLayout)(task.args);
        }
        if (task.command === "add-component-property") {
          result = await safeToolProcessor(addComponentProperty)(task.args);
        }
        if (task.command === "edit-component-property") {
          result = await safeToolProcessor(editComponentProperty)(task.args);
        }
        if (task.command === "delete-component-property") {
          result = await safeToolProcessor(deleteComponentProperty)(task.args);
        }
        if (task.command === "set-instance-properties") {
          result = await safeToolProcessor(setInstanceProperties)(task.args);
        }
        if (task.command === "set-node-component-property-references") {
          result = await safeToolProcessor(setNodeComponentPropertyReferences)(task.args);
        }
        if (task.command === "create-component") {
          result = await safeToolProcessor(createComponent)(task.args);
        }
        if (task.command === "set-parent-id") {
          result = await safeToolProcessor(setParentId)(task.args);
        }
        if (task.command === "create-image") {
          result = await safeToolProcessor(createImage)(task.args);
        }
        if (task.command === "add-prototype-link") {
          result = await safeToolProcessor(addPrototypeLink)(task.args);
        }
        if (result) {
          if (result.isError) {
            emit("TASK_FAILED", {
              name: "TASK_FAILED",
              taskId: task.taskId,
              content: result.content,
              isError: result.isError
            });
          } else {
            emit("TASK_FINISHED", {
              name: "TASK_FINISHED",
              taskId: task.taskId,
              content: result.content,
              isError: result.isError
            });
          }
        }
      } catch (error) {
        console.error(error);
        emit("TASK_FAILED", {
          name: "TASK_FAILED",
          taskId: task.taskId,
          content: error instanceof Error ? error.message : JSON.stringify(error),
          isError: true
        });
      }
    });
    on("RESIZE_UI", function({ width, height }) {
      figma.ui.resize(width, height);
    });
    const additionalData = `<div id='data' />`;
    const html = `${additionalData}${__html__}`;
    figma.showUI(`${html}`, { width: 300, height: 320 });
  }
  main();
})();
//# sourceMappingURL=main.js.map
