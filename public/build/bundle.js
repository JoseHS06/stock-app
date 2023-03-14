
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop$1;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var top = 'top';
    var bottom = 'bottom';
    var right = 'right';
    var left = 'left';
    var auto = 'auto';
    var basePlacements = [top, bottom, right, left];
    var start = 'start';
    var end = 'end';
    var clippingParents = 'clippingParents';
    var viewport = 'viewport';
    var popper = 'popper';
    var reference = 'reference';
    var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
      return acc.concat([placement + "-" + start, placement + "-" + end]);
    }, []);
    var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
      return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
    }, []); // modifiers that need to read the DOM

    var beforeRead = 'beforeRead';
    var read = 'read';
    var afterRead = 'afterRead'; // pure-logic modifiers

    var beforeMain = 'beforeMain';
    var main = 'main';
    var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

    var beforeWrite = 'beforeWrite';
    var write = 'write';
    var afterWrite = 'afterWrite';
    var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

    function getNodeName(element) {
      return element ? (element.nodeName || '').toLowerCase() : null;
    }

    function getWindow(node) {
      if (node == null) {
        return window;
      }

      if (node.toString() !== '[object Window]') {
        var ownerDocument = node.ownerDocument;
        return ownerDocument ? ownerDocument.defaultView || window : window;
      }

      return node;
    }

    function isElement$1(node) {
      var OwnElement = getWindow(node).Element;
      return node instanceof OwnElement || node instanceof Element;
    }

    function isHTMLElement(node) {
      var OwnElement = getWindow(node).HTMLElement;
      return node instanceof OwnElement || node instanceof HTMLElement;
    }

    function isShadowRoot(node) {
      // IE 11 has no ShadowRoot
      if (typeof ShadowRoot === 'undefined') {
        return false;
      }

      var OwnElement = getWindow(node).ShadowRoot;
      return node instanceof OwnElement || node instanceof ShadowRoot;
    }

    // and applies them to the HTMLElements such as popper and arrow

    function applyStyles(_ref) {
      var state = _ref.state;
      Object.keys(state.elements).forEach(function (name) {
        var style = state.styles[name] || {};
        var attributes = state.attributes[name] || {};
        var element = state.elements[name]; // arrow is optional + virtual elements

        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        } // Flow doesn't support to extend this property, but it's the most
        // effective way to apply styles to an HTMLElement
        // $FlowFixMe[cannot-write]


        Object.assign(element.style, style);
        Object.keys(attributes).forEach(function (name) {
          var value = attributes[name];

          if (value === false) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, value === true ? '' : value);
          }
        });
      });
    }

    function effect$2(_ref2) {
      var state = _ref2.state;
      var initialStyles = {
        popper: {
          position: state.options.strategy,
          left: '0',
          top: '0',
          margin: '0'
        },
        arrow: {
          position: 'absolute'
        },
        reference: {}
      };
      Object.assign(state.elements.popper.style, initialStyles.popper);
      state.styles = initialStyles;

      if (state.elements.arrow) {
        Object.assign(state.elements.arrow.style, initialStyles.arrow);
      }

      return function () {
        Object.keys(state.elements).forEach(function (name) {
          var element = state.elements[name];
          var attributes = state.attributes[name] || {};
          var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

          var style = styleProperties.reduce(function (style, property) {
            style[property] = '';
            return style;
          }, {}); // arrow is optional + virtual elements

          if (!isHTMLElement(element) || !getNodeName(element)) {
            return;
          }

          Object.assign(element.style, style);
          Object.keys(attributes).forEach(function (attribute) {
            element.removeAttribute(attribute);
          });
        });
      };
    } // eslint-disable-next-line import/no-unused-modules


    var applyStyles$1 = {
      name: 'applyStyles',
      enabled: true,
      phase: 'write',
      fn: applyStyles,
      effect: effect$2,
      requires: ['computeStyles']
    };

    function getBasePlacement(placement) {
      return placement.split('-')[0];
    }

    var max = Math.max;
    var min = Math.min;
    var round = Math.round;

    function getUAString() {
      var uaData = navigator.userAgentData;

      if (uaData != null && uaData.brands) {
        return uaData.brands.map(function (item) {
          return item.brand + "/" + item.version;
        }).join(' ');
      }

      return navigator.userAgent;
    }

    function isLayoutViewport() {
      return !/^((?!chrome|android).)*safari/i.test(getUAString());
    }

    function getBoundingClientRect(element, includeScale, isFixedStrategy) {
      if (includeScale === void 0) {
        includeScale = false;
      }

      if (isFixedStrategy === void 0) {
        isFixedStrategy = false;
      }

      var clientRect = element.getBoundingClientRect();
      var scaleX = 1;
      var scaleY = 1;

      if (includeScale && isHTMLElement(element)) {
        scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
        scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
      }

      var _ref = isElement$1(element) ? getWindow(element) : window,
          visualViewport = _ref.visualViewport;

      var addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
      var x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
      var y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
      var width = clientRect.width / scaleX;
      var height = clientRect.height / scaleY;
      return {
        width: width,
        height: height,
        top: y,
        right: x + width,
        bottom: y + height,
        left: x,
        x: x,
        y: y
      };
    }

    // means it doesn't take into account transforms.

    function getLayoutRect(element) {
      var clientRect = getBoundingClientRect(element); // Use the clientRect sizes if it's not been transformed.
      // Fixes https://github.com/popperjs/popper-core/issues/1223

      var width = element.offsetWidth;
      var height = element.offsetHeight;

      if (Math.abs(clientRect.width - width) <= 1) {
        width = clientRect.width;
      }

      if (Math.abs(clientRect.height - height) <= 1) {
        height = clientRect.height;
      }

      return {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: width,
        height: height
      };
    }

    function contains(parent, child) {
      var rootNode = child.getRootNode && child.getRootNode(); // First, attempt with faster native method

      if (parent.contains(child)) {
        return true;
      } // then fallback to custom implementation with Shadow DOM support
      else if (rootNode && isShadowRoot(rootNode)) {
          var next = child;

          do {
            if (next && parent.isSameNode(next)) {
              return true;
            } // $FlowFixMe[prop-missing]: need a better way to handle this...


            next = next.parentNode || next.host;
          } while (next);
        } // Give up, the result is false


      return false;
    }

    function getComputedStyle$1(element) {
      return getWindow(element).getComputedStyle(element);
    }

    function isTableElement(element) {
      return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
    }

    function getDocumentElement(element) {
      // $FlowFixMe[incompatible-return]: assume body is always available
      return ((isElement$1(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
      element.document) || window.document).documentElement;
    }

    function getParentNode(element) {
      if (getNodeName(element) === 'html') {
        return element;
      }

      return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
        // $FlowFixMe[incompatible-return]
        // $FlowFixMe[prop-missing]
        element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
        element.parentNode || ( // DOM Element detected
        isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
        // $FlowFixMe[incompatible-call]: HTMLElement is a Node
        getDocumentElement(element) // fallback

      );
    }

    function getTrueOffsetParent(element) {
      if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
      getComputedStyle$1(element).position === 'fixed') {
        return null;
      }

      return element.offsetParent;
    } // `.offsetParent` reports `null` for fixed elements, while absolute elements
    // return the containing block


    function getContainingBlock(element) {
      var isFirefox = /firefox/i.test(getUAString());
      var isIE = /Trident/i.test(getUAString());

      if (isIE && isHTMLElement(element)) {
        // In IE 9, 10 and 11 fixed elements containing block is always established by the viewport
        var elementCss = getComputedStyle$1(element);

        if (elementCss.position === 'fixed') {
          return null;
        }
      }

      var currentNode = getParentNode(element);

      if (isShadowRoot(currentNode)) {
        currentNode = currentNode.host;
      }

      while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
        var css = getComputedStyle$1(currentNode); // This is non-exhaustive but covers the most common CSS properties that
        // create a containing block.
        // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

        if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
          return currentNode;
        } else {
          currentNode = currentNode.parentNode;
        }
      }

      return null;
    } // Gets the closest ancestor positioned element. Handles some edge cases,
    // such as table ancestors and cross browser bugs.


    function getOffsetParent(element) {
      var window = getWindow(element);
      var offsetParent = getTrueOffsetParent(element);

      while (offsetParent && isTableElement(offsetParent) && getComputedStyle$1(offsetParent).position === 'static') {
        offsetParent = getTrueOffsetParent(offsetParent);
      }

      if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle$1(offsetParent).position === 'static')) {
        return window;
      }

      return offsetParent || getContainingBlock(element) || window;
    }

    function getMainAxisFromPlacement(placement) {
      return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
    }

    function within(min$1, value, max$1) {
      return max(min$1, min(value, max$1));
    }
    function withinMaxClamp(min, value, max) {
      var v = within(min, value, max);
      return v > max ? max : v;
    }

    function getFreshSideObject() {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
    }

    function mergePaddingObject(paddingObject) {
      return Object.assign({}, getFreshSideObject(), paddingObject);
    }

    function expandToHashMap(value, keys) {
      return keys.reduce(function (hashMap, key) {
        hashMap[key] = value;
        return hashMap;
      }, {});
    }

    var toPaddingObject = function toPaddingObject(padding, state) {
      padding = typeof padding === 'function' ? padding(Object.assign({}, state.rects, {
        placement: state.placement
      })) : padding;
      return mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
    };

    function arrow(_ref) {
      var _state$modifiersData$;

      var state = _ref.state,
          name = _ref.name,
          options = _ref.options;
      var arrowElement = state.elements.arrow;
      var popperOffsets = state.modifiersData.popperOffsets;
      var basePlacement = getBasePlacement(state.placement);
      var axis = getMainAxisFromPlacement(basePlacement);
      var isVertical = [left, right].indexOf(basePlacement) >= 0;
      var len = isVertical ? 'height' : 'width';

      if (!arrowElement || !popperOffsets) {
        return;
      }

      var paddingObject = toPaddingObject(options.padding, state);
      var arrowRect = getLayoutRect(arrowElement);
      var minProp = axis === 'y' ? top : left;
      var maxProp = axis === 'y' ? bottom : right;
      var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
      var startDiff = popperOffsets[axis] - state.rects.reference[axis];
      var arrowOffsetParent = getOffsetParent(arrowElement);
      var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
      var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
      // outside of the popper bounds

      var min = paddingObject[minProp];
      var max = clientSize - arrowRect[len] - paddingObject[maxProp];
      var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
      var offset = within(min, center, max); // Prevents breaking syntax highlighting...

      var axisProp = axis;
      state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
    }

    function effect$1(_ref2) {
      var state = _ref2.state,
          options = _ref2.options;
      var _options$element = options.element,
          arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element;

      if (arrowElement == null) {
        return;
      } // CSS selector


      if (typeof arrowElement === 'string') {
        arrowElement = state.elements.popper.querySelector(arrowElement);

        if (!arrowElement) {
          return;
        }
      }

      if (process.env.NODE_ENV !== "production") {
        if (!isHTMLElement(arrowElement)) {
          console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '));
        }
      }

      if (!contains(state.elements.popper, arrowElement)) {
        if (process.env.NODE_ENV !== "production") {
          console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '));
        }

        return;
      }

      state.elements.arrow = arrowElement;
    } // eslint-disable-next-line import/no-unused-modules


    var arrow$1 = {
      name: 'arrow',
      enabled: true,
      phase: 'main',
      fn: arrow,
      effect: effect$1,
      requires: ['popperOffsets'],
      requiresIfExists: ['preventOverflow']
    };

    function getVariation(placement) {
      return placement.split('-')[1];
    }

    var unsetSides = {
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      left: 'auto'
    }; // Round the offsets to the nearest suitable subpixel based on the DPR.
    // Zooming can change the DPR, but it seems to report a value that will
    // cleanly divide the values into the appropriate subpixels.

    function roundOffsetsByDPR(_ref) {
      var x = _ref.x,
          y = _ref.y;
      var win = window;
      var dpr = win.devicePixelRatio || 1;
      return {
        x: round(x * dpr) / dpr || 0,
        y: round(y * dpr) / dpr || 0
      };
    }

    function mapToStyles(_ref2) {
      var _Object$assign2;

      var popper = _ref2.popper,
          popperRect = _ref2.popperRect,
          placement = _ref2.placement,
          variation = _ref2.variation,
          offsets = _ref2.offsets,
          position = _ref2.position,
          gpuAcceleration = _ref2.gpuAcceleration,
          adaptive = _ref2.adaptive,
          roundOffsets = _ref2.roundOffsets,
          isFixed = _ref2.isFixed;
      var _offsets$x = offsets.x,
          x = _offsets$x === void 0 ? 0 : _offsets$x,
          _offsets$y = offsets.y,
          y = _offsets$y === void 0 ? 0 : _offsets$y;

      var _ref3 = typeof roundOffsets === 'function' ? roundOffsets({
        x: x,
        y: y
      }) : {
        x: x,
        y: y
      };

      x = _ref3.x;
      y = _ref3.y;
      var hasX = offsets.hasOwnProperty('x');
      var hasY = offsets.hasOwnProperty('y');
      var sideX = left;
      var sideY = top;
      var win = window;

      if (adaptive) {
        var offsetParent = getOffsetParent(popper);
        var heightProp = 'clientHeight';
        var widthProp = 'clientWidth';

        if (offsetParent === getWindow(popper)) {
          offsetParent = getDocumentElement(popper);

          if (getComputedStyle$1(offsetParent).position !== 'static' && position === 'absolute') {
            heightProp = 'scrollHeight';
            widthProp = 'scrollWidth';
          }
        } // $FlowFixMe[incompatible-cast]: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it


        offsetParent = offsetParent;

        if (placement === top || (placement === left || placement === right) && variation === end) {
          sideY = bottom;
          var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : // $FlowFixMe[prop-missing]
          offsetParent[heightProp];
          y -= offsetY - popperRect.height;
          y *= gpuAcceleration ? 1 : -1;
        }

        if (placement === left || (placement === top || placement === bottom) && variation === end) {
          sideX = right;
          var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : // $FlowFixMe[prop-missing]
          offsetParent[widthProp];
          x -= offsetX - popperRect.width;
          x *= gpuAcceleration ? 1 : -1;
        }
      }

      var commonStyles = Object.assign({
        position: position
      }, adaptive && unsetSides);

      var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
        x: x,
        y: y
      }) : {
        x: x,
        y: y
      };

      x = _ref4.x;
      y = _ref4.y;

      if (gpuAcceleration) {
        var _Object$assign;

        return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
      }

      return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
    }

    function computeStyles(_ref5) {
      var state = _ref5.state,
          options = _ref5.options;
      var _options$gpuAccelerat = options.gpuAcceleration,
          gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
          _options$adaptive = options.adaptive,
          adaptive = _options$adaptive === void 0 ? true : _options$adaptive,
          _options$roundOffsets = options.roundOffsets,
          roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;

      if (process.env.NODE_ENV !== "production") {
        var transitionProperty = getComputedStyle$1(state.elements.popper).transitionProperty || '';

        if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
          return transitionProperty.indexOf(property) >= 0;
        })) {
          console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '));
        }
      }

      var commonStyles = {
        placement: getBasePlacement(state.placement),
        variation: getVariation(state.placement),
        popper: state.elements.popper,
        popperRect: state.rects.popper,
        gpuAcceleration: gpuAcceleration,
        isFixed: state.options.strategy === 'fixed'
      };

      if (state.modifiersData.popperOffsets != null) {
        state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.popperOffsets,
          position: state.options.strategy,
          adaptive: adaptive,
          roundOffsets: roundOffsets
        })));
      }

      if (state.modifiersData.arrow != null) {
        state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.arrow,
          position: 'absolute',
          adaptive: false,
          roundOffsets: roundOffsets
        })));
      }

      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-placement': state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var computeStyles$1 = {
      name: 'computeStyles',
      enabled: true,
      phase: 'beforeWrite',
      fn: computeStyles,
      data: {}
    };

    var passive = {
      passive: true
    };

    function effect(_ref) {
      var state = _ref.state,
          instance = _ref.instance,
          options = _ref.options;
      var _options$scroll = options.scroll,
          scroll = _options$scroll === void 0 ? true : _options$scroll,
          _options$resize = options.resize,
          resize = _options$resize === void 0 ? true : _options$resize;
      var window = getWindow(state.elements.popper);
      var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

      if (scroll) {
        scrollParents.forEach(function (scrollParent) {
          scrollParent.addEventListener('scroll', instance.update, passive);
        });
      }

      if (resize) {
        window.addEventListener('resize', instance.update, passive);
      }

      return function () {
        if (scroll) {
          scrollParents.forEach(function (scrollParent) {
            scrollParent.removeEventListener('scroll', instance.update, passive);
          });
        }

        if (resize) {
          window.removeEventListener('resize', instance.update, passive);
        }
      };
    } // eslint-disable-next-line import/no-unused-modules


    var eventListeners = {
      name: 'eventListeners',
      enabled: true,
      phase: 'write',
      fn: function fn() {},
      effect: effect,
      data: {}
    };

    var hash$1 = {
      left: 'right',
      right: 'left',
      bottom: 'top',
      top: 'bottom'
    };
    function getOppositePlacement(placement) {
      return placement.replace(/left|right|bottom|top/g, function (matched) {
        return hash$1[matched];
      });
    }

    var hash = {
      start: 'end',
      end: 'start'
    };
    function getOppositeVariationPlacement(placement) {
      return placement.replace(/start|end/g, function (matched) {
        return hash[matched];
      });
    }

    function getWindowScroll(node) {
      var win = getWindow(node);
      var scrollLeft = win.pageXOffset;
      var scrollTop = win.pageYOffset;
      return {
        scrollLeft: scrollLeft,
        scrollTop: scrollTop
      };
    }

    function getWindowScrollBarX(element) {
      // If <html> has a CSS width greater than the viewport, then this will be
      // incorrect for RTL.
      // Popper 1 is broken in this case and never had a bug report so let's assume
      // it's not an issue. I don't think anyone ever specifies width on <html>
      // anyway.
      // Browsers where the left scrollbar doesn't cause an issue report `0` for
      // this (e.g. Edge 2019, IE11, Safari)
      return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
    }

    function getViewportRect(element, strategy) {
      var win = getWindow(element);
      var html = getDocumentElement(element);
      var visualViewport = win.visualViewport;
      var width = html.clientWidth;
      var height = html.clientHeight;
      var x = 0;
      var y = 0;

      if (visualViewport) {
        width = visualViewport.width;
        height = visualViewport.height;
        var layoutViewport = isLayoutViewport();

        if (layoutViewport || !layoutViewport && strategy === 'fixed') {
          x = visualViewport.offsetLeft;
          y = visualViewport.offsetTop;
        }
      }

      return {
        width: width,
        height: height,
        x: x + getWindowScrollBarX(element),
        y: y
      };
    }

    // of the `<html>` and `<body>` rect bounds if horizontally scrollable

    function getDocumentRect(element) {
      var _element$ownerDocumen;

      var html = getDocumentElement(element);
      var winScroll = getWindowScroll(element);
      var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
      var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
      var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
      var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
      var y = -winScroll.scrollTop;

      if (getComputedStyle$1(body || html).direction === 'rtl') {
        x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
      }

      return {
        width: width,
        height: height,
        x: x,
        y: y
      };
    }

    function isScrollParent(element) {
      // Firefox wants us to check `-x` and `-y` variations as well
      var _getComputedStyle = getComputedStyle$1(element),
          overflow = _getComputedStyle.overflow,
          overflowX = _getComputedStyle.overflowX,
          overflowY = _getComputedStyle.overflowY;

      return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
    }

    function getScrollParent(node) {
      if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
        // $FlowFixMe[incompatible-return]: assume body is always available
        return node.ownerDocument.body;
      }

      if (isHTMLElement(node) && isScrollParent(node)) {
        return node;
      }

      return getScrollParent(getParentNode(node));
    }

    /*
    given a DOM element, return the list of all scroll parents, up the list of ancesors
    until we get to the top window object. This list is what we attach scroll listeners
    to, because if any of these parent elements scroll, we'll need to re-calculate the
    reference element's position.
    */

    function listScrollParents(element, list) {
      var _element$ownerDocumen;

      if (list === void 0) {
        list = [];
      }

      var scrollParent = getScrollParent(element);
      var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
      var win = getWindow(scrollParent);
      var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
      var updatedList = list.concat(target);
      return isBody ? updatedList : // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
      updatedList.concat(listScrollParents(getParentNode(target)));
    }

    function rectToClientRect(rect) {
      return Object.assign({}, rect, {
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height
      });
    }

    function getInnerBoundingClientRect(element, strategy) {
      var rect = getBoundingClientRect(element, false, strategy === 'fixed');
      rect.top = rect.top + element.clientTop;
      rect.left = rect.left + element.clientLeft;
      rect.bottom = rect.top + element.clientHeight;
      rect.right = rect.left + element.clientWidth;
      rect.width = element.clientWidth;
      rect.height = element.clientHeight;
      rect.x = rect.left;
      rect.y = rect.top;
      return rect;
    }

    function getClientRectFromMixedType(element, clippingParent, strategy) {
      return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement$1(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
    } // A "clipping parent" is an overflowable container with the characteristic of
    // clipping (or hiding) overflowing elements with a position different from
    // `initial`


    function getClippingParents(element) {
      var clippingParents = listScrollParents(getParentNode(element));
      var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle$1(element).position) >= 0;
      var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

      if (!isElement$1(clipperElement)) {
        return [];
      } // $FlowFixMe[incompatible-return]: https://github.com/facebook/flow/issues/1414


      return clippingParents.filter(function (clippingParent) {
        return isElement$1(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
      });
    } // Gets the maximum area that the element is visible in due to any number of
    // clipping parents


    function getClippingRect(element, boundary, rootBoundary, strategy) {
      var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
      var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
      var firstClippingParent = clippingParents[0];
      var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
        var rect = getClientRectFromMixedType(element, clippingParent, strategy);
        accRect.top = max(rect.top, accRect.top);
        accRect.right = min(rect.right, accRect.right);
        accRect.bottom = min(rect.bottom, accRect.bottom);
        accRect.left = max(rect.left, accRect.left);
        return accRect;
      }, getClientRectFromMixedType(element, firstClippingParent, strategy));
      clippingRect.width = clippingRect.right - clippingRect.left;
      clippingRect.height = clippingRect.bottom - clippingRect.top;
      clippingRect.x = clippingRect.left;
      clippingRect.y = clippingRect.top;
      return clippingRect;
    }

    function computeOffsets(_ref) {
      var reference = _ref.reference,
          element = _ref.element,
          placement = _ref.placement;
      var basePlacement = placement ? getBasePlacement(placement) : null;
      var variation = placement ? getVariation(placement) : null;
      var commonX = reference.x + reference.width / 2 - element.width / 2;
      var commonY = reference.y + reference.height / 2 - element.height / 2;
      var offsets;

      switch (basePlacement) {
        case top:
          offsets = {
            x: commonX,
            y: reference.y - element.height
          };
          break;

        case bottom:
          offsets = {
            x: commonX,
            y: reference.y + reference.height
          };
          break;

        case right:
          offsets = {
            x: reference.x + reference.width,
            y: commonY
          };
          break;

        case left:
          offsets = {
            x: reference.x - element.width,
            y: commonY
          };
          break;

        default:
          offsets = {
            x: reference.x,
            y: reference.y
          };
      }

      var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

      if (mainAxis != null) {
        var len = mainAxis === 'y' ? 'height' : 'width';

        switch (variation) {
          case start:
            offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
            break;

          case end:
            offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
            break;
        }
      }

      return offsets;
    }

    function detectOverflow(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          _options$placement = _options.placement,
          placement = _options$placement === void 0 ? state.placement : _options$placement,
          _options$strategy = _options.strategy,
          strategy = _options$strategy === void 0 ? state.strategy : _options$strategy,
          _options$boundary = _options.boundary,
          boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
          _options$rootBoundary = _options.rootBoundary,
          rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
          _options$elementConte = _options.elementContext,
          elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
          _options$altBoundary = _options.altBoundary,
          altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
          _options$padding = _options.padding,
          padding = _options$padding === void 0 ? 0 : _options$padding;
      var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
      var altContext = elementContext === popper ? reference : popper;
      var popperRect = state.rects.popper;
      var element = state.elements[altBoundary ? altContext : elementContext];
      var clippingClientRect = getClippingRect(isElement$1(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy);
      var referenceClientRect = getBoundingClientRect(state.elements.reference);
      var popperOffsets = computeOffsets({
        reference: referenceClientRect,
        element: popperRect,
        strategy: 'absolute',
        placement: placement
      });
      var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
      var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
      // 0 or negative = within the clipping rect

      var overflowOffsets = {
        top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
        bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
        left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
        right: elementClientRect.right - clippingClientRect.right + paddingObject.right
      };
      var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

      if (elementContext === popper && offsetData) {
        var offset = offsetData[placement];
        Object.keys(overflowOffsets).forEach(function (key) {
          var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
          var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
          overflowOffsets[key] += offset[axis] * multiply;
        });
      }

      return overflowOffsets;
    }

    function computeAutoPlacement(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          placement = _options.placement,
          boundary = _options.boundary,
          rootBoundary = _options.rootBoundary,
          padding = _options.padding,
          flipVariations = _options.flipVariations,
          _options$allowedAutoP = _options.allowedAutoPlacements,
          allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
      var variation = getVariation(placement);
      var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
        return getVariation(placement) === variation;
      }) : basePlacements;
      var allowedPlacements = placements$1.filter(function (placement) {
        return allowedAutoPlacements.indexOf(placement) >= 0;
      });

      if (allowedPlacements.length === 0) {
        allowedPlacements = placements$1;

        if (process.env.NODE_ENV !== "production") {
          console.error(['Popper: The `allowedAutoPlacements` option did not allow any', 'placements. Ensure the `placement` option matches the variation', 'of the allowed placements.', 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(' '));
        }
      } // $FlowFixMe[incompatible-type]: Flow seems to have problems with two array unions...


      var overflows = allowedPlacements.reduce(function (acc, placement) {
        acc[placement] = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding
        })[getBasePlacement(placement)];
        return acc;
      }, {});
      return Object.keys(overflows).sort(function (a, b) {
        return overflows[a] - overflows[b];
      });
    }

    function getExpandedFallbackPlacements(placement) {
      if (getBasePlacement(placement) === auto) {
        return [];
      }

      var oppositePlacement = getOppositePlacement(placement);
      return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
    }

    function flip(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;

      if (state.modifiersData[name]._skip) {
        return;
      }

      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
          specifiedFallbackPlacements = options.fallbackPlacements,
          padding = options.padding,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          _options$flipVariatio = options.flipVariations,
          flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
          allowedAutoPlacements = options.allowedAutoPlacements;
      var preferredPlacement = state.options.placement;
      var basePlacement = getBasePlacement(preferredPlacement);
      var isBasePlacement = basePlacement === preferredPlacement;
      var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
      var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
        return acc.concat(getBasePlacement(placement) === auto ? computeAutoPlacement(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding,
          flipVariations: flipVariations,
          allowedAutoPlacements: allowedAutoPlacements
        }) : placement);
      }, []);
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var checksMap = new Map();
      var makeFallbackChecks = true;
      var firstFittingPlacement = placements[0];

      for (var i = 0; i < placements.length; i++) {
        var placement = placements[i];

        var _basePlacement = getBasePlacement(placement);

        var isStartVariation = getVariation(placement) === start;
        var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
        var len = isVertical ? 'width' : 'height';
        var overflow = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          altBoundary: altBoundary,
          padding: padding
        });
        var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

        if (referenceRect[len] > popperRect[len]) {
          mainVariationSide = getOppositePlacement(mainVariationSide);
        }

        var altVariationSide = getOppositePlacement(mainVariationSide);
        var checks = [];

        if (checkMainAxis) {
          checks.push(overflow[_basePlacement] <= 0);
        }

        if (checkAltAxis) {
          checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
        }

        if (checks.every(function (check) {
          return check;
        })) {
          firstFittingPlacement = placement;
          makeFallbackChecks = false;
          break;
        }

        checksMap.set(placement, checks);
      }

      if (makeFallbackChecks) {
        // `2` may be desired in some cases – research later
        var numberOfChecks = flipVariations ? 3 : 1;

        var _loop = function _loop(_i) {
          var fittingPlacement = placements.find(function (placement) {
            var checks = checksMap.get(placement);

            if (checks) {
              return checks.slice(0, _i).every(function (check) {
                return check;
              });
            }
          });

          if (fittingPlacement) {
            firstFittingPlacement = fittingPlacement;
            return "break";
          }
        };

        for (var _i = numberOfChecks; _i > 0; _i--) {
          var _ret = _loop(_i);

          if (_ret === "break") break;
        }
      }

      if (state.placement !== firstFittingPlacement) {
        state.modifiersData[name]._skip = true;
        state.placement = firstFittingPlacement;
        state.reset = true;
      }
    } // eslint-disable-next-line import/no-unused-modules


    var flip$1 = {
      name: 'flip',
      enabled: true,
      phase: 'main',
      fn: flip,
      requiresIfExists: ['offset'],
      data: {
        _skip: false
      }
    };

    function getSideOffsets(overflow, rect, preventedOffsets) {
      if (preventedOffsets === void 0) {
        preventedOffsets = {
          x: 0,
          y: 0
        };
      }

      return {
        top: overflow.top - rect.height - preventedOffsets.y,
        right: overflow.right - rect.width + preventedOffsets.x,
        bottom: overflow.bottom - rect.height + preventedOffsets.y,
        left: overflow.left - rect.width - preventedOffsets.x
      };
    }

    function isAnySideFullyClipped(overflow) {
      return [top, right, bottom, left].some(function (side) {
        return overflow[side] >= 0;
      });
    }

    function hide(_ref) {
      var state = _ref.state,
          name = _ref.name;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var preventedOffsets = state.modifiersData.preventOverflow;
      var referenceOverflow = detectOverflow(state, {
        elementContext: 'reference'
      });
      var popperAltOverflow = detectOverflow(state, {
        altBoundary: true
      });
      var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
      var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
      var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
      var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
      state.modifiersData[name] = {
        referenceClippingOffsets: referenceClippingOffsets,
        popperEscapeOffsets: popperEscapeOffsets,
        isReferenceHidden: isReferenceHidden,
        hasPopperEscaped: hasPopperEscaped
      };
      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-reference-hidden': isReferenceHidden,
        'data-popper-escaped': hasPopperEscaped
      });
    } // eslint-disable-next-line import/no-unused-modules


    var hide$1 = {
      name: 'hide',
      enabled: true,
      phase: 'main',
      requiresIfExists: ['preventOverflow'],
      fn: hide
    };

    function distanceAndSkiddingToXY(placement, rects, offset) {
      var basePlacement = getBasePlacement(placement);
      var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

      var _ref = typeof offset === 'function' ? offset(Object.assign({}, rects, {
        placement: placement
      })) : offset,
          skidding = _ref[0],
          distance = _ref[1];

      skidding = skidding || 0;
      distance = (distance || 0) * invertDistance;
      return [left, right].indexOf(basePlacement) >= 0 ? {
        x: distance,
        y: skidding
      } : {
        x: skidding,
        y: distance
      };
    }

    function offset(_ref2) {
      var state = _ref2.state,
          options = _ref2.options,
          name = _ref2.name;
      var _options$offset = options.offset,
          offset = _options$offset === void 0 ? [0, 0] : _options$offset;
      var data = placements.reduce(function (acc, placement) {
        acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
        return acc;
      }, {});
      var _data$state$placement = data[state.placement],
          x = _data$state$placement.x,
          y = _data$state$placement.y;

      if (state.modifiersData.popperOffsets != null) {
        state.modifiersData.popperOffsets.x += x;
        state.modifiersData.popperOffsets.y += y;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var offset$1 = {
      name: 'offset',
      enabled: true,
      phase: 'main',
      requires: ['popperOffsets'],
      fn: offset
    };

    function popperOffsets(_ref) {
      var state = _ref.state,
          name = _ref.name;
      // Offsets are the actual position the popper needs to have to be
      // properly positioned near its reference element
      // This is the most basic placement, and will be adjusted by
      // the modifiers in the next step
      state.modifiersData[name] = computeOffsets({
        reference: state.rects.reference,
        element: state.rects.popper,
        strategy: 'absolute',
        placement: state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var popperOffsets$1 = {
      name: 'popperOffsets',
      enabled: true,
      phase: 'read',
      fn: popperOffsets,
      data: {}
    };

    function getAltAxis(axis) {
      return axis === 'x' ? 'y' : 'x';
    }

    function preventOverflow(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;
      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          padding = options.padding,
          _options$tether = options.tether,
          tether = _options$tether === void 0 ? true : _options$tether,
          _options$tetherOffset = options.tetherOffset,
          tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
      var overflow = detectOverflow(state, {
        boundary: boundary,
        rootBoundary: rootBoundary,
        padding: padding,
        altBoundary: altBoundary
      });
      var basePlacement = getBasePlacement(state.placement);
      var variation = getVariation(state.placement);
      var isBasePlacement = !variation;
      var mainAxis = getMainAxisFromPlacement(basePlacement);
      var altAxis = getAltAxis(mainAxis);
      var popperOffsets = state.modifiersData.popperOffsets;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign({}, state.rects, {
        placement: state.placement
      })) : tetherOffset;
      var normalizedTetherOffsetValue = typeof tetherOffsetValue === 'number' ? {
        mainAxis: tetherOffsetValue,
        altAxis: tetherOffsetValue
      } : Object.assign({
        mainAxis: 0,
        altAxis: 0
      }, tetherOffsetValue);
      var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
      var data = {
        x: 0,
        y: 0
      };

      if (!popperOffsets) {
        return;
      }

      if (checkMainAxis) {
        var _offsetModifierState$;

        var mainSide = mainAxis === 'y' ? top : left;
        var altSide = mainAxis === 'y' ? bottom : right;
        var len = mainAxis === 'y' ? 'height' : 'width';
        var offset = popperOffsets[mainAxis];
        var min$1 = offset + overflow[mainSide];
        var max$1 = offset - overflow[altSide];
        var additive = tether ? -popperRect[len] / 2 : 0;
        var minLen = variation === start ? referenceRect[len] : popperRect[len];
        var maxLen = variation === start ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
        // outside the reference bounds

        var arrowElement = state.elements.arrow;
        var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
          width: 0,
          height: 0
        };
        var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
        var arrowPaddingMin = arrowPaddingObject[mainSide];
        var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
        // to include its full size in the calculation. If the reference is small
        // and near the edge of a boundary, the popper can overflow even if the
        // reference is not overflowing as well (e.g. virtual elements with no
        // width or height)

        var arrowLen = within(0, referenceRect[len], arrowRect[len]);
        var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
        var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
        var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
        var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
        var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
        var tetherMin = offset + minOffset - offsetModifierValue - clientOffset;
        var tetherMax = offset + maxOffset - offsetModifierValue;
        var preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1);
        popperOffsets[mainAxis] = preventedOffset;
        data[mainAxis] = preventedOffset - offset;
      }

      if (checkAltAxis) {
        var _offsetModifierState$2;

        var _mainSide = mainAxis === 'x' ? top : left;

        var _altSide = mainAxis === 'x' ? bottom : right;

        var _offset = popperOffsets[altAxis];

        var _len = altAxis === 'y' ? 'height' : 'width';

        var _min = _offset + overflow[_mainSide];

        var _max = _offset - overflow[_altSide];

        var isOriginSide = [top, left].indexOf(basePlacement) !== -1;

        var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;

        var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;

        var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;

        var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);

        popperOffsets[altAxis] = _preventedOffset;
        data[altAxis] = _preventedOffset - _offset;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var preventOverflow$1 = {
      name: 'preventOverflow',
      enabled: true,
      phase: 'main',
      fn: preventOverflow,
      requiresIfExists: ['offset']
    };

    function getHTMLElementScroll(element) {
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop
      };
    }

    function getNodeScroll(node) {
      if (node === getWindow(node) || !isHTMLElement(node)) {
        return getWindowScroll(node);
      } else {
        return getHTMLElementScroll(node);
      }
    }

    function isElementScaled(element) {
      var rect = element.getBoundingClientRect();
      var scaleX = round(rect.width) / element.offsetWidth || 1;
      var scaleY = round(rect.height) / element.offsetHeight || 1;
      return scaleX !== 1 || scaleY !== 1;
    } // Returns the composite rect of an element relative to its offsetParent.
    // Composite means it takes into account transforms as well as layout.


    function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
      if (isFixed === void 0) {
        isFixed = false;
      }

      var isOffsetParentAnElement = isHTMLElement(offsetParent);
      var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
      var documentElement = getDocumentElement(offsetParent);
      var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
      var scroll = {
        scrollLeft: 0,
        scrollTop: 0
      };
      var offsets = {
        x: 0,
        y: 0
      };

      if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
        if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
        isScrollParent(documentElement)) {
          scroll = getNodeScroll(offsetParent);
        }

        if (isHTMLElement(offsetParent)) {
          offsets = getBoundingClientRect(offsetParent, true);
          offsets.x += offsetParent.clientLeft;
          offsets.y += offsetParent.clientTop;
        } else if (documentElement) {
          offsets.x = getWindowScrollBarX(documentElement);
        }
      }

      return {
        x: rect.left + scroll.scrollLeft - offsets.x,
        y: rect.top + scroll.scrollTop - offsets.y,
        width: rect.width,
        height: rect.height
      };
    }

    function order(modifiers) {
      var map = new Map();
      var visited = new Set();
      var result = [];
      modifiers.forEach(function (modifier) {
        map.set(modifier.name, modifier);
      }); // On visiting object, check for its dependencies and visit them recursively

      function sort(modifier) {
        visited.add(modifier.name);
        var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
        requires.forEach(function (dep) {
          if (!visited.has(dep)) {
            var depModifier = map.get(dep);

            if (depModifier) {
              sort(depModifier);
            }
          }
        });
        result.push(modifier);
      }

      modifiers.forEach(function (modifier) {
        if (!visited.has(modifier.name)) {
          // check for visited object
          sort(modifier);
        }
      });
      return result;
    }

    function orderModifiers(modifiers) {
      // order based on dependencies
      var orderedModifiers = order(modifiers); // order based on phase

      return modifierPhases.reduce(function (acc, phase) {
        return acc.concat(orderedModifiers.filter(function (modifier) {
          return modifier.phase === phase;
        }));
      }, []);
    }

    function debounce(fn) {
      var pending;
      return function () {
        if (!pending) {
          pending = new Promise(function (resolve) {
            Promise.resolve().then(function () {
              pending = undefined;
              resolve(fn());
            });
          });
        }

        return pending;
      };
    }

    function format(str) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return [].concat(args).reduce(function (p, c) {
        return p.replace(/%s/, c);
      }, str);
    }

    var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
    var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
    var VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options'];
    function validateModifiers(modifiers) {
      modifiers.forEach(function (modifier) {
        [].concat(Object.keys(modifier), VALID_PROPERTIES) // IE11-compatible replacement for `new Set(iterable)`
        .filter(function (value, index, self) {
          return self.indexOf(value) === index;
        }).forEach(function (key) {
          switch (key) {
            case 'name':
              if (typeof modifier.name !== 'string') {
                console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', "\"" + String(modifier.name) + "\""));
              }

              break;

            case 'enabled':
              if (typeof modifier.enabled !== 'boolean') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', "\"" + String(modifier.enabled) + "\""));
              }

              break;

            case 'phase':
              if (modifierPhases.indexOf(modifier.phase) < 0) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(', '), "\"" + String(modifier.phase) + "\""));
              }

              break;

            case 'fn':
              if (typeof modifier.fn !== 'function') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', "\"" + String(modifier.fn) + "\""));
              }

              break;

            case 'effect':
              if (modifier.effect != null && typeof modifier.effect !== 'function') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', "\"" + String(modifier.fn) + "\""));
              }

              break;

            case 'requires':
              if (modifier.requires != null && !Array.isArray(modifier.requires)) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', "\"" + String(modifier.requires) + "\""));
              }

              break;

            case 'requiresIfExists':
              if (!Array.isArray(modifier.requiresIfExists)) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', "\"" + String(modifier.requiresIfExists) + "\""));
              }

              break;

            case 'options':
            case 'data':
              break;

            default:
              console.error("PopperJS: an invalid property has been provided to the \"" + modifier.name + "\" modifier, valid properties are " + VALID_PROPERTIES.map(function (s) {
                return "\"" + s + "\"";
              }).join(', ') + "; but \"" + key + "\" was provided.");
          }

          modifier.requires && modifier.requires.forEach(function (requirement) {
            if (modifiers.find(function (mod) {
              return mod.name === requirement;
            }) == null) {
              console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
            }
          });
        });
      });
    }

    function uniqueBy(arr, fn) {
      var identifiers = new Set();
      return arr.filter(function (item) {
        var identifier = fn(item);

        if (!identifiers.has(identifier)) {
          identifiers.add(identifier);
          return true;
        }
      });
    }

    function mergeByName(modifiers) {
      var merged = modifiers.reduce(function (merged, current) {
        var existing = merged[current.name];
        merged[current.name] = existing ? Object.assign({}, existing, current, {
          options: Object.assign({}, existing.options, current.options),
          data: Object.assign({}, existing.data, current.data)
        }) : current;
        return merged;
      }, {}); // IE11 does not support Object.values

      return Object.keys(merged).map(function (key) {
        return merged[key];
      });
    }

    var INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.';
    var INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.';
    var DEFAULT_OPTIONS = {
      placement: 'bottom',
      modifiers: [],
      strategy: 'absolute'
    };

    function areValidElements() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return !args.some(function (element) {
        return !(element && typeof element.getBoundingClientRect === 'function');
      });
    }

    function popperGenerator(generatorOptions) {
      if (generatorOptions === void 0) {
        generatorOptions = {};
      }

      var _generatorOptions = generatorOptions,
          _generatorOptions$def = _generatorOptions.defaultModifiers,
          defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
          _generatorOptions$def2 = _generatorOptions.defaultOptions,
          defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
      return function createPopper(reference, popper, options) {
        if (options === void 0) {
          options = defaultOptions;
        }

        var state = {
          placement: 'bottom',
          orderedModifiers: [],
          options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
          modifiersData: {},
          elements: {
            reference: reference,
            popper: popper
          },
          attributes: {},
          styles: {}
        };
        var effectCleanupFns = [];
        var isDestroyed = false;
        var instance = {
          state: state,
          setOptions: function setOptions(setOptionsAction) {
            var options = typeof setOptionsAction === 'function' ? setOptionsAction(state.options) : setOptionsAction;
            cleanupModifierEffects();
            state.options = Object.assign({}, defaultOptions, state.options, options);
            state.scrollParents = {
              reference: isElement$1(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
              popper: listScrollParents(popper)
            }; // Orders the modifiers based on their dependencies and `phase`
            // properties

            var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

            state.orderedModifiers = orderedModifiers.filter(function (m) {
              return m.enabled;
            }); // Validate the provided modifiers so that the consumer will get warned
            // if one of the modifiers is invalid for any reason

            if (process.env.NODE_ENV !== "production") {
              var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
                var name = _ref.name;
                return name;
              });
              validateModifiers(modifiers);

              if (getBasePlacement(state.options.placement) === auto) {
                var flipModifier = state.orderedModifiers.find(function (_ref2) {
                  var name = _ref2.name;
                  return name === 'flip';
                });

                if (!flipModifier) {
                  console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '));
                }
              }

              var _getComputedStyle = getComputedStyle$1(popper),
                  marginTop = _getComputedStyle.marginTop,
                  marginRight = _getComputedStyle.marginRight,
                  marginBottom = _getComputedStyle.marginBottom,
                  marginLeft = _getComputedStyle.marginLeft; // We no longer take into account `margins` on the popper, and it can
              // cause bugs with positioning, so we'll warn the consumer


              if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
                return parseFloat(margin);
              })) {
                console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '));
              }
            }

            runModifierEffects();
            return instance.update();
          },
          // Sync update – it will always be executed, even if not necessary. This
          // is useful for low frequency updates where sync behavior simplifies the
          // logic.
          // For high frequency updates (e.g. `resize` and `scroll` events), always
          // prefer the async Popper#update method
          forceUpdate: function forceUpdate() {
            if (isDestroyed) {
              return;
            }

            var _state$elements = state.elements,
                reference = _state$elements.reference,
                popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
            // anymore

            if (!areValidElements(reference, popper)) {
              if (process.env.NODE_ENV !== "production") {
                console.error(INVALID_ELEMENT_ERROR);
              }

              return;
            } // Store the reference and popper rects to be read by modifiers


            state.rects = {
              reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
              popper: getLayoutRect(popper)
            }; // Modifiers have the ability to reset the current update cycle. The
            // most common use case for this is the `flip` modifier changing the
            // placement, which then needs to re-run all the modifiers, because the
            // logic was previously ran for the previous placement and is therefore
            // stale/incorrect

            state.reset = false;
            state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
            // is filled with the initial data specified by the modifier. This means
            // it doesn't persist and is fresh on each update.
            // To ensure persistent data, use `${name}#persistent`

            state.orderedModifiers.forEach(function (modifier) {
              return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
            });
            var __debug_loops__ = 0;

            for (var index = 0; index < state.orderedModifiers.length; index++) {
              if (process.env.NODE_ENV !== "production") {
                __debug_loops__ += 1;

                if (__debug_loops__ > 100) {
                  console.error(INFINITE_LOOP_ERROR);
                  break;
                }
              }

              if (state.reset === true) {
                state.reset = false;
                index = -1;
                continue;
              }

              var _state$orderedModifie = state.orderedModifiers[index],
                  fn = _state$orderedModifie.fn,
                  _state$orderedModifie2 = _state$orderedModifie.options,
                  _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
                  name = _state$orderedModifie.name;

              if (typeof fn === 'function') {
                state = fn({
                  state: state,
                  options: _options,
                  name: name,
                  instance: instance
                }) || state;
              }
            }
          },
          // Async and optimistically optimized update – it will not be executed if
          // not necessary (debounced to run at most once-per-tick)
          update: debounce(function () {
            return new Promise(function (resolve) {
              instance.forceUpdate();
              resolve(state);
            });
          }),
          destroy: function destroy() {
            cleanupModifierEffects();
            isDestroyed = true;
          }
        };

        if (!areValidElements(reference, popper)) {
          if (process.env.NODE_ENV !== "production") {
            console.error(INVALID_ELEMENT_ERROR);
          }

          return instance;
        }

        instance.setOptions(options).then(function (state) {
          if (!isDestroyed && options.onFirstUpdate) {
            options.onFirstUpdate(state);
          }
        }); // Modifiers have the ability to execute arbitrary code before the first
        // update cycle runs. They will be executed in the same order as the update
        // cycle. This is useful when a modifier adds some persistent data that
        // other modifiers need to use, but the modifier is run after the dependent
        // one.

        function runModifierEffects() {
          state.orderedModifiers.forEach(function (_ref3) {
            var name = _ref3.name,
                _ref3$options = _ref3.options,
                options = _ref3$options === void 0 ? {} : _ref3$options,
                effect = _ref3.effect;

            if (typeof effect === 'function') {
              var cleanupFn = effect({
                state: state,
                name: name,
                instance: instance,
                options: options
              });

              var noopFn = function noopFn() {};

              effectCleanupFns.push(cleanupFn || noopFn);
            }
          });
        }

        function cleanupModifierEffects() {
          effectCleanupFns.forEach(function (fn) {
            return fn();
          });
          effectCleanupFns = [];
        }

        return instance;
      };
    }
    var createPopper$2 = /*#__PURE__*/popperGenerator(); // eslint-disable-next-line import/no-unused-modules

    var defaultModifiers$1 = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1];
    var createPopper$1 = /*#__PURE__*/popperGenerator({
      defaultModifiers: defaultModifiers$1
    }); // eslint-disable-next-line import/no-unused-modules

    var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1];
    var createPopper = /*#__PURE__*/popperGenerator({
      defaultModifiers: defaultModifiers
    }); // eslint-disable-next-line import/no-unused-modules

    var Popper = /*#__PURE__*/Object.freeze({
        __proto__: null,
        afterMain: afterMain,
        afterRead: afterRead,
        afterWrite: afterWrite,
        applyStyles: applyStyles$1,
        arrow: arrow$1,
        auto: auto,
        basePlacements: basePlacements,
        beforeMain: beforeMain,
        beforeRead: beforeRead,
        beforeWrite: beforeWrite,
        bottom: bottom,
        clippingParents: clippingParents,
        computeStyles: computeStyles$1,
        createPopper: createPopper,
        createPopperBase: createPopper$2,
        createPopperLite: createPopper$1,
        detectOverflow: detectOverflow,
        end: end,
        eventListeners: eventListeners,
        flip: flip$1,
        hide: hide$1,
        left: left,
        main: main,
        modifierPhases: modifierPhases,
        offset: offset$1,
        placements: placements,
        popper: popper,
        popperGenerator: popperGenerator,
        popperOffsets: popperOffsets$1,
        preventOverflow: preventOverflow$1,
        read: read,
        reference: reference,
        right: right,
        start: start,
        top: top,
        variationPlacements: variationPlacements,
        viewport: viewport,
        write: write
    });

    /*!
      * Bootstrap v5.2.3 (https://getbootstrap.com/)
      * Copyright 2011-2022 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
      * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
      */

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/index.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    const MAX_UID = 1000000;
    const MILLISECONDS_MULTIPLIER = 1000;
    const TRANSITION_END = 'transitionend'; // Shout-out Angus Croll (https://goo.gl/pxwQGp)

    const toType = object => {
      if (object === null || object === undefined) {
        return `${object}`;
      }

      return Object.prototype.toString.call(object).match(/\s([a-z]+)/i)[1].toLowerCase();
    };
    /**
     * Public Util API
     */


    const getUID = prefix => {
      do {
        prefix += Math.floor(Math.random() * MAX_UID);
      } while (document.getElementById(prefix));

      return prefix;
    };

    const getSelector = element => {
      let selector = element.getAttribute('data-bs-target');

      if (!selector || selector === '#') {
        let hrefAttribute = element.getAttribute('href'); // The only valid content that could double as a selector are IDs or classes,
        // so everything starting with `#` or `.`. If a "real" URL is used as the selector,
        // `document.querySelector` will rightfully complain it is invalid.
        // See https://github.com/twbs/bootstrap/issues/32273

        if (!hrefAttribute || !hrefAttribute.includes('#') && !hrefAttribute.startsWith('.')) {
          return null;
        } // Just in case some CMS puts out a full URL with the anchor appended


        if (hrefAttribute.includes('#') && !hrefAttribute.startsWith('#')) {
          hrefAttribute = `#${hrefAttribute.split('#')[1]}`;
        }

        selector = hrefAttribute && hrefAttribute !== '#' ? hrefAttribute.trim() : null;
      }

      return selector;
    };

    const getSelectorFromElement = element => {
      const selector = getSelector(element);

      if (selector) {
        return document.querySelector(selector) ? selector : null;
      }

      return null;
    };

    const getElementFromSelector = element => {
      const selector = getSelector(element);
      return selector ? document.querySelector(selector) : null;
    };

    const getTransitionDurationFromElement = element => {
      if (!element) {
        return 0;
      } // Get transition-duration of the element


      let {
        transitionDuration,
        transitionDelay
      } = window.getComputedStyle(element);
      const floatTransitionDuration = Number.parseFloat(transitionDuration);
      const floatTransitionDelay = Number.parseFloat(transitionDelay); // Return 0 if element or transition duration is not found

      if (!floatTransitionDuration && !floatTransitionDelay) {
        return 0;
      } // If multiple durations are defined, take the first


      transitionDuration = transitionDuration.split(',')[0];
      transitionDelay = transitionDelay.split(',')[0];
      return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
    };

    const triggerTransitionEnd = element => {
      element.dispatchEvent(new Event(TRANSITION_END));
    };

    const isElement = object => {
      if (!object || typeof object !== 'object') {
        return false;
      }

      if (typeof object.jquery !== 'undefined') {
        object = object[0];
      }

      return typeof object.nodeType !== 'undefined';
    };

    const getElement = object => {
      // it's a jQuery object or a node element
      if (isElement(object)) {
        return object.jquery ? object[0] : object;
      }

      if (typeof object === 'string' && object.length > 0) {
        return document.querySelector(object);
      }

      return null;
    };

    const isVisible = element => {
      if (!isElement(element) || element.getClientRects().length === 0) {
        return false;
      }

      const elementIsVisible = getComputedStyle(element).getPropertyValue('visibility') === 'visible'; // Handle `details` element as its content may falsie appear visible when it is closed

      const closedDetails = element.closest('details:not([open])');

      if (!closedDetails) {
        return elementIsVisible;
      }

      if (closedDetails !== element) {
        const summary = element.closest('summary');

        if (summary && summary.parentNode !== closedDetails) {
          return false;
        }

        if (summary === null) {
          return false;
        }
      }

      return elementIsVisible;
    };

    const isDisabled = element => {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return true;
      }

      if (element.classList.contains('disabled')) {
        return true;
      }

      if (typeof element.disabled !== 'undefined') {
        return element.disabled;
      }

      return element.hasAttribute('disabled') && element.getAttribute('disabled') !== 'false';
    };

    const findShadowRoot = element => {
      if (!document.documentElement.attachShadow) {
        return null;
      } // Can find the shadow root otherwise it'll return the document


      if (typeof element.getRootNode === 'function') {
        const root = element.getRootNode();
        return root instanceof ShadowRoot ? root : null;
      }

      if (element instanceof ShadowRoot) {
        return element;
      } // when we don't find a shadow root


      if (!element.parentNode) {
        return null;
      }

      return findShadowRoot(element.parentNode);
    };

    const noop = () => {};
    /**
     * Trick to restart an element's animation
     *
     * @param {HTMLElement} element
     * @return void
     *
     * @see https://www.charistheo.io/blog/2021/02/restart-a-css-animation-with-javascript/#restarting-a-css-animation
     */


    const reflow = element => {
      element.offsetHeight; // eslint-disable-line no-unused-expressions
    };

    const getjQuery = () => {
      if (window.jQuery && !document.body.hasAttribute('data-bs-no-jquery')) {
        return window.jQuery;
      }

      return null;
    };

    const DOMContentLoadedCallbacks = [];

    const onDOMContentLoaded = callback => {
      if (document.readyState === 'loading') {
        // add listener on the first call when the document is in loading state
        if (!DOMContentLoadedCallbacks.length) {
          document.addEventListener('DOMContentLoaded', () => {
            for (const callback of DOMContentLoadedCallbacks) {
              callback();
            }
          });
        }

        DOMContentLoadedCallbacks.push(callback);
      } else {
        callback();
      }
    };

    const isRTL = () => document.documentElement.dir === 'rtl';

    const defineJQueryPlugin = plugin => {
      onDOMContentLoaded(() => {
        const $ = getjQuery();
        /* istanbul ignore if */

        if ($) {
          const name = plugin.NAME;
          const JQUERY_NO_CONFLICT = $.fn[name];
          $.fn[name] = plugin.jQueryInterface;
          $.fn[name].Constructor = plugin;

          $.fn[name].noConflict = () => {
            $.fn[name] = JQUERY_NO_CONFLICT;
            return plugin.jQueryInterface;
          };
        }
      });
    };

    const execute = callback => {
      if (typeof callback === 'function') {
        callback();
      }
    };

    const executeAfterTransition = (callback, transitionElement, waitForTransition = true) => {
      if (!waitForTransition) {
        execute(callback);
        return;
      }

      const durationPadding = 5;
      const emulatedDuration = getTransitionDurationFromElement(transitionElement) + durationPadding;
      let called = false;

      const handler = ({
        target
      }) => {
        if (target !== transitionElement) {
          return;
        }

        called = true;
        transitionElement.removeEventListener(TRANSITION_END, handler);
        execute(callback);
      };

      transitionElement.addEventListener(TRANSITION_END, handler);
      setTimeout(() => {
        if (!called) {
          triggerTransitionEnd(transitionElement);
        }
      }, emulatedDuration);
    };
    /**
     * Return the previous/next element of a list.
     *
     * @param {array} list    The list of elements
     * @param activeElement   The active element
     * @param shouldGetNext   Choose to get next or previous element
     * @param isCycleAllowed
     * @return {Element|elem} The proper element
     */


    const getNextActiveElement = (list, activeElement, shouldGetNext, isCycleAllowed) => {
      const listLength = list.length;
      let index = list.indexOf(activeElement); // if the element does not exist in the list return an element
      // depending on the direction and if cycle is allowed

      if (index === -1) {
        return !shouldGetNext && isCycleAllowed ? list[listLength - 1] : list[0];
      }

      index += shouldGetNext ? 1 : -1;

      if (isCycleAllowed) {
        index = (index + listLength) % listLength;
      }

      return list[Math.max(0, Math.min(index, listLength - 1))];
    };

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): dom/event-handler.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const namespaceRegex = /[^.]*(?=\..*)\.|.*/;
    const stripNameRegex = /\..*/;
    const stripUidRegex = /::\d+$/;
    const eventRegistry = {}; // Events storage

    let uidEvent = 1;
    const customEvents = {
      mouseenter: 'mouseover',
      mouseleave: 'mouseout'
    };
    const nativeEvents = new Set(['click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu', 'mousewheel', 'DOMMouseScroll', 'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend', 'keydown', 'keypress', 'keyup', 'orientationchange', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointercancel', 'gesturestart', 'gesturechange', 'gestureend', 'focus', 'blur', 'change', 'reset', 'select', 'submit', 'focusin', 'focusout', 'load', 'unload', 'beforeunload', 'resize', 'move', 'DOMContentLoaded', 'readystatechange', 'error', 'abort', 'scroll']);
    /**
     * Private methods
     */

    function makeEventUid(element, uid) {
      return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++;
    }

    function getElementEvents(element) {
      const uid = makeEventUid(element);
      element.uidEvent = uid;
      eventRegistry[uid] = eventRegistry[uid] || {};
      return eventRegistry[uid];
    }

    function bootstrapHandler(element, fn) {
      return function handler(event) {
        hydrateObj(event, {
          delegateTarget: element
        });

        if (handler.oneOff) {
          EventHandler.off(element, event.type, fn);
        }

        return fn.apply(element, [event]);
      };
    }

    function bootstrapDelegationHandler(element, selector, fn) {
      return function handler(event) {
        const domElements = element.querySelectorAll(selector);

        for (let {
          target
        } = event; target && target !== this; target = target.parentNode) {
          for (const domElement of domElements) {
            if (domElement !== target) {
              continue;
            }

            hydrateObj(event, {
              delegateTarget: target
            });

            if (handler.oneOff) {
              EventHandler.off(element, event.type, selector, fn);
            }

            return fn.apply(target, [event]);
          }
        }
      };
    }

    function findHandler(events, callable, delegationSelector = null) {
      return Object.values(events).find(event => event.callable === callable && event.delegationSelector === delegationSelector);
    }

    function normalizeParameters(originalTypeEvent, handler, delegationFunction) {
      const isDelegated = typeof handler === 'string'; // todo: tooltip passes `false` instead of selector, so we need to check

      const callable = isDelegated ? delegationFunction : handler || delegationFunction;
      let typeEvent = getTypeEvent(originalTypeEvent);

      if (!nativeEvents.has(typeEvent)) {
        typeEvent = originalTypeEvent;
      }

      return [isDelegated, callable, typeEvent];
    }

    function addHandler(element, originalTypeEvent, handler, delegationFunction, oneOff) {
      if (typeof originalTypeEvent !== 'string' || !element) {
        return;
      }

      let [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction); // in case of mouseenter or mouseleave wrap the handler within a function that checks for its DOM position
      // this prevents the handler from being dispatched the same way as mouseover or mouseout does

      if (originalTypeEvent in customEvents) {
        const wrapFunction = fn => {
          return function (event) {
            if (!event.relatedTarget || event.relatedTarget !== event.delegateTarget && !event.delegateTarget.contains(event.relatedTarget)) {
              return fn.call(this, event);
            }
          };
        };

        callable = wrapFunction(callable);
      }

      const events = getElementEvents(element);
      const handlers = events[typeEvent] || (events[typeEvent] = {});
      const previousFunction = findHandler(handlers, callable, isDelegated ? handler : null);

      if (previousFunction) {
        previousFunction.oneOff = previousFunction.oneOff && oneOff;
        return;
      }

      const uid = makeEventUid(callable, originalTypeEvent.replace(namespaceRegex, ''));
      const fn = isDelegated ? bootstrapDelegationHandler(element, handler, callable) : bootstrapHandler(element, callable);
      fn.delegationSelector = isDelegated ? handler : null;
      fn.callable = callable;
      fn.oneOff = oneOff;
      fn.uidEvent = uid;
      handlers[uid] = fn;
      element.addEventListener(typeEvent, fn, isDelegated);
    }

    function removeHandler(element, events, typeEvent, handler, delegationSelector) {
      const fn = findHandler(events[typeEvent], handler, delegationSelector);

      if (!fn) {
        return;
      }

      element.removeEventListener(typeEvent, fn, Boolean(delegationSelector));
      delete events[typeEvent][fn.uidEvent];
    }

    function removeNamespacedHandlers(element, events, typeEvent, namespace) {
      const storeElementEvent = events[typeEvent] || {};

      for (const handlerKey of Object.keys(storeElementEvent)) {
        if (handlerKey.includes(namespace)) {
          const event = storeElementEvent[handlerKey];
          removeHandler(element, events, typeEvent, event.callable, event.delegationSelector);
        }
      }
    }

    function getTypeEvent(event) {
      // allow to get the native events from namespaced events ('click.bs.button' --> 'click')
      event = event.replace(stripNameRegex, '');
      return customEvents[event] || event;
    }

    const EventHandler = {
      on(element, event, handler, delegationFunction) {
        addHandler(element, event, handler, delegationFunction, false);
      },

      one(element, event, handler, delegationFunction) {
        addHandler(element, event, handler, delegationFunction, true);
      },

      off(element, originalTypeEvent, handler, delegationFunction) {
        if (typeof originalTypeEvent !== 'string' || !element) {
          return;
        }

        const [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction);
        const inNamespace = typeEvent !== originalTypeEvent;
        const events = getElementEvents(element);
        const storeElementEvent = events[typeEvent] || {};
        const isNamespace = originalTypeEvent.startsWith('.');

        if (typeof callable !== 'undefined') {
          // Simplest case: handler is passed, remove that listener ONLY.
          if (!Object.keys(storeElementEvent).length) {
            return;
          }

          removeHandler(element, events, typeEvent, callable, isDelegated ? handler : null);
          return;
        }

        if (isNamespace) {
          for (const elementEvent of Object.keys(events)) {
            removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
          }
        }

        for (const keyHandlers of Object.keys(storeElementEvent)) {
          const handlerKey = keyHandlers.replace(stripUidRegex, '');

          if (!inNamespace || originalTypeEvent.includes(handlerKey)) {
            const event = storeElementEvent[keyHandlers];
            removeHandler(element, events, typeEvent, event.callable, event.delegationSelector);
          }
        }
      },

      trigger(element, event, args) {
        if (typeof event !== 'string' || !element) {
          return null;
        }

        const $ = getjQuery();
        const typeEvent = getTypeEvent(event);
        const inNamespace = event !== typeEvent;
        let jQueryEvent = null;
        let bubbles = true;
        let nativeDispatch = true;
        let defaultPrevented = false;

        if (inNamespace && $) {
          jQueryEvent = $.Event(event, args);
          $(element).trigger(jQueryEvent);
          bubbles = !jQueryEvent.isPropagationStopped();
          nativeDispatch = !jQueryEvent.isImmediatePropagationStopped();
          defaultPrevented = jQueryEvent.isDefaultPrevented();
        }

        let evt = new Event(event, {
          bubbles,
          cancelable: true
        });
        evt = hydrateObj(evt, args);

        if (defaultPrevented) {
          evt.preventDefault();
        }

        if (nativeDispatch) {
          element.dispatchEvent(evt);
        }

        if (evt.defaultPrevented && jQueryEvent) {
          jQueryEvent.preventDefault();
        }

        return evt;
      }

    };

    function hydrateObj(obj, meta) {
      for (const [key, value] of Object.entries(meta || {})) {
        try {
          obj[key] = value;
        } catch (_unused) {
          Object.defineProperty(obj, key, {
            configurable: true,

            get() {
              return value;
            }

          });
        }
      }

      return obj;
    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): dom/data.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */

    /**
     * Constants
     */
    const elementMap = new Map();
    const Data = {
      set(element, key, instance) {
        if (!elementMap.has(element)) {
          elementMap.set(element, new Map());
        }

        const instanceMap = elementMap.get(element); // make it clear we only want one instance per element
        // can be removed later when multiple key/instances are fine to be used

        if (!instanceMap.has(key) && instanceMap.size !== 0) {
          // eslint-disable-next-line no-console
          console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(instanceMap.keys())[0]}.`);
          return;
        }

        instanceMap.set(key, instance);
      },

      get(element, key) {
        if (elementMap.has(element)) {
          return elementMap.get(element).get(key) || null;
        }

        return null;
      },

      remove(element, key) {
        if (!elementMap.has(element)) {
          return;
        }

        const instanceMap = elementMap.get(element);
        instanceMap.delete(key); // free up element references if there are no instances left for an element

        if (instanceMap.size === 0) {
          elementMap.delete(element);
        }
      }

    };

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): dom/manipulator.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    function normalizeData(value) {
      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }

      if (value === Number(value).toString()) {
        return Number(value);
      }

      if (value === '' || value === 'null') {
        return null;
      }

      if (typeof value !== 'string') {
        return value;
      }

      try {
        return JSON.parse(decodeURIComponent(value));
      } catch (_unused) {
        return value;
      }
    }

    function normalizeDataKey(key) {
      return key.replace(/[A-Z]/g, chr => `-${chr.toLowerCase()}`);
    }

    const Manipulator = {
      setDataAttribute(element, key, value) {
        element.setAttribute(`data-bs-${normalizeDataKey(key)}`, value);
      },

      removeDataAttribute(element, key) {
        element.removeAttribute(`data-bs-${normalizeDataKey(key)}`);
      },

      getDataAttributes(element) {
        if (!element) {
          return {};
        }

        const attributes = {};
        const bsKeys = Object.keys(element.dataset).filter(key => key.startsWith('bs') && !key.startsWith('bsConfig'));

        for (const key of bsKeys) {
          let pureKey = key.replace(/^bs/, '');
          pureKey = pureKey.charAt(0).toLowerCase() + pureKey.slice(1, pureKey.length);
          attributes[pureKey] = normalizeData(element.dataset[key]);
        }

        return attributes;
      },

      getDataAttribute(element, key) {
        return normalizeData(element.getAttribute(`data-bs-${normalizeDataKey(key)}`));
      }

    };

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/config.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Class definition
     */

    class Config {
      // Getters
      static get Default() {
        return {};
      }

      static get DefaultType() {
        return {};
      }

      static get NAME() {
        throw new Error('You have to implement the static method "NAME", for each component!');
      }

      _getConfig(config) {
        config = this._mergeConfigObj(config);
        config = this._configAfterMerge(config);

        this._typeCheckConfig(config);

        return config;
      }

      _configAfterMerge(config) {
        return config;
      }

      _mergeConfigObj(config, element) {
        const jsonConfig = isElement(element) ? Manipulator.getDataAttribute(element, 'config') : {}; // try to parse

        return { ...this.constructor.Default,
          ...(typeof jsonConfig === 'object' ? jsonConfig : {}),
          ...(isElement(element) ? Manipulator.getDataAttributes(element) : {}),
          ...(typeof config === 'object' ? config : {})
        };
      }

      _typeCheckConfig(config, configTypes = this.constructor.DefaultType) {
        for (const property of Object.keys(configTypes)) {
          const expectedTypes = configTypes[property];
          const value = config[property];
          const valueType = isElement(value) ? 'element' : toType(value);

          if (!new RegExp(expectedTypes).test(valueType)) {
            throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${property}" provided type "${valueType}" but expected type "${expectedTypes}".`);
          }
        }
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): base-component.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const VERSION = '5.2.3';
    /**
     * Class definition
     */

    class BaseComponent extends Config {
      constructor(element, config) {
        super();
        element = getElement(element);

        if (!element) {
          return;
        }

        this._element = element;
        this._config = this._getConfig(config);
        Data.set(this._element, this.constructor.DATA_KEY, this);
      } // Public


      dispose() {
        Data.remove(this._element, this.constructor.DATA_KEY);
        EventHandler.off(this._element, this.constructor.EVENT_KEY);

        for (const propertyName of Object.getOwnPropertyNames(this)) {
          this[propertyName] = null;
        }
      }

      _queueCallback(callback, element, isAnimated = true) {
        executeAfterTransition(callback, element, isAnimated);
      }

      _getConfig(config) {
        config = this._mergeConfigObj(config, this._element);
        config = this._configAfterMerge(config);

        this._typeCheckConfig(config);

        return config;
      } // Static


      static getInstance(element) {
        return Data.get(getElement(element), this.DATA_KEY);
      }

      static getOrCreateInstance(element, config = {}) {
        return this.getInstance(element) || new this(element, typeof config === 'object' ? config : null);
      }

      static get VERSION() {
        return VERSION;
      }

      static get DATA_KEY() {
        return `bs.${this.NAME}`;
      }

      static get EVENT_KEY() {
        return `.${this.DATA_KEY}`;
      }

      static eventName(name) {
        return `${name}${this.EVENT_KEY}`;
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/component-functions.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */

    const enableDismissTrigger = (component, method = 'hide') => {
      const clickEvent = `click.dismiss${component.EVENT_KEY}`;
      const name = component.NAME;
      EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, function (event) {
        if (['A', 'AREA'].includes(this.tagName)) {
          event.preventDefault();
        }

        if (isDisabled(this)) {
          return;
        }

        const target = getElementFromSelector(this) || this.closest(`.${name}`);
        const instance = component.getOrCreateInstance(target); // Method argument is left, for Alert and only, as it doesn't implement the 'hide' method

        instance[method]();
      });
    };

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): alert.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$f = 'alert';
    const DATA_KEY$a = 'bs.alert';
    const EVENT_KEY$b = `.${DATA_KEY$a}`;
    const EVENT_CLOSE = `close${EVENT_KEY$b}`;
    const EVENT_CLOSED = `closed${EVENT_KEY$b}`;
    const CLASS_NAME_FADE$5 = 'fade';
    const CLASS_NAME_SHOW$8 = 'show';
    /**
     * Class definition
     */

    class Alert extends BaseComponent {
      // Getters
      static get NAME() {
        return NAME$f;
      } // Public


      close() {
        const closeEvent = EventHandler.trigger(this._element, EVENT_CLOSE);

        if (closeEvent.defaultPrevented) {
          return;
        }

        this._element.classList.remove(CLASS_NAME_SHOW$8);

        const isAnimated = this._element.classList.contains(CLASS_NAME_FADE$5);

        this._queueCallback(() => this._destroyElement(), this._element, isAnimated);
      } // Private


      _destroyElement() {
        this._element.remove();

        EventHandler.trigger(this._element, EVENT_CLOSED);
        this.dispose();
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Alert.getOrCreateInstance(this);

          if (typeof config !== 'string') {
            return;
          }

          if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config](this);
        });
      }

    }
    /**
     * Data API implementation
     */


    enableDismissTrigger(Alert, 'close');
    /**
     * jQuery
     */

    defineJQueryPlugin(Alert);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): button.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$e = 'button';
    const DATA_KEY$9 = 'bs.button';
    const EVENT_KEY$a = `.${DATA_KEY$9}`;
    const DATA_API_KEY$6 = '.data-api';
    const CLASS_NAME_ACTIVE$3 = 'active';
    const SELECTOR_DATA_TOGGLE$5 = '[data-bs-toggle="button"]';
    const EVENT_CLICK_DATA_API$6 = `click${EVENT_KEY$a}${DATA_API_KEY$6}`;
    /**
     * Class definition
     */

    class Button extends BaseComponent {
      // Getters
      static get NAME() {
        return NAME$e;
      } // Public


      toggle() {
        // Toggle class and sync the `aria-pressed` attribute with the return value of the `.toggle()` method
        this._element.setAttribute('aria-pressed', this._element.classList.toggle(CLASS_NAME_ACTIVE$3));
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Button.getOrCreateInstance(this);

          if (config === 'toggle') {
            data[config]();
          }
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_CLICK_DATA_API$6, SELECTOR_DATA_TOGGLE$5, event => {
      event.preventDefault();
      const button = event.target.closest(SELECTOR_DATA_TOGGLE$5);
      const data = Button.getOrCreateInstance(button);
      data.toggle();
    });
    /**
     * jQuery
     */

    defineJQueryPlugin(Button);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): dom/selector-engine.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const SelectorEngine = {
      find(selector, element = document.documentElement) {
        return [].concat(...Element.prototype.querySelectorAll.call(element, selector));
      },

      findOne(selector, element = document.documentElement) {
        return Element.prototype.querySelector.call(element, selector);
      },

      children(element, selector) {
        return [].concat(...element.children).filter(child => child.matches(selector));
      },

      parents(element, selector) {
        const parents = [];
        let ancestor = element.parentNode.closest(selector);

        while (ancestor) {
          parents.push(ancestor);
          ancestor = ancestor.parentNode.closest(selector);
        }

        return parents;
      },

      prev(element, selector) {
        let previous = element.previousElementSibling;

        while (previous) {
          if (previous.matches(selector)) {
            return [previous];
          }

          previous = previous.previousElementSibling;
        }

        return [];
      },

      // TODO: this is now unused; remove later along with prev()
      next(element, selector) {
        let next = element.nextElementSibling;

        while (next) {
          if (next.matches(selector)) {
            return [next];
          }

          next = next.nextElementSibling;
        }

        return [];
      },

      focusableChildren(element) {
        const focusables = ['a', 'button', 'input', 'textarea', 'select', 'details', '[tabindex]', '[contenteditable="true"]'].map(selector => `${selector}:not([tabindex^="-"])`).join(',');
        return this.find(focusables, element).filter(el => !isDisabled(el) && isVisible(el));
      }

    };

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/swipe.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$d = 'swipe';
    const EVENT_KEY$9 = '.bs.swipe';
    const EVENT_TOUCHSTART = `touchstart${EVENT_KEY$9}`;
    const EVENT_TOUCHMOVE = `touchmove${EVENT_KEY$9}`;
    const EVENT_TOUCHEND = `touchend${EVENT_KEY$9}`;
    const EVENT_POINTERDOWN = `pointerdown${EVENT_KEY$9}`;
    const EVENT_POINTERUP = `pointerup${EVENT_KEY$9}`;
    const POINTER_TYPE_TOUCH = 'touch';
    const POINTER_TYPE_PEN = 'pen';
    const CLASS_NAME_POINTER_EVENT = 'pointer-event';
    const SWIPE_THRESHOLD = 40;
    const Default$c = {
      endCallback: null,
      leftCallback: null,
      rightCallback: null
    };
    const DefaultType$c = {
      endCallback: '(function|null)',
      leftCallback: '(function|null)',
      rightCallback: '(function|null)'
    };
    /**
     * Class definition
     */

    class Swipe extends Config {
      constructor(element, config) {
        super();
        this._element = element;

        if (!element || !Swipe.isSupported()) {
          return;
        }

        this._config = this._getConfig(config);
        this._deltaX = 0;
        this._supportPointerEvents = Boolean(window.PointerEvent);

        this._initEvents();
      } // Getters


      static get Default() {
        return Default$c;
      }

      static get DefaultType() {
        return DefaultType$c;
      }

      static get NAME() {
        return NAME$d;
      } // Public


      dispose() {
        EventHandler.off(this._element, EVENT_KEY$9);
      } // Private


      _start(event) {
        if (!this._supportPointerEvents) {
          this._deltaX = event.touches[0].clientX;
          return;
        }

        if (this._eventIsPointerPenTouch(event)) {
          this._deltaX = event.clientX;
        }
      }

      _end(event) {
        if (this._eventIsPointerPenTouch(event)) {
          this._deltaX = event.clientX - this._deltaX;
        }

        this._handleSwipe();

        execute(this._config.endCallback);
      }

      _move(event) {
        this._deltaX = event.touches && event.touches.length > 1 ? 0 : event.touches[0].clientX - this._deltaX;
      }

      _handleSwipe() {
        const absDeltaX = Math.abs(this._deltaX);

        if (absDeltaX <= SWIPE_THRESHOLD) {
          return;
        }

        const direction = absDeltaX / this._deltaX;
        this._deltaX = 0;

        if (!direction) {
          return;
        }

        execute(direction > 0 ? this._config.rightCallback : this._config.leftCallback);
      }

      _initEvents() {
        if (this._supportPointerEvents) {
          EventHandler.on(this._element, EVENT_POINTERDOWN, event => this._start(event));
          EventHandler.on(this._element, EVENT_POINTERUP, event => this._end(event));

          this._element.classList.add(CLASS_NAME_POINTER_EVENT);
        } else {
          EventHandler.on(this._element, EVENT_TOUCHSTART, event => this._start(event));
          EventHandler.on(this._element, EVENT_TOUCHMOVE, event => this._move(event));
          EventHandler.on(this._element, EVENT_TOUCHEND, event => this._end(event));
        }
      }

      _eventIsPointerPenTouch(event) {
        return this._supportPointerEvents && (event.pointerType === POINTER_TYPE_PEN || event.pointerType === POINTER_TYPE_TOUCH);
      } // Static


      static isSupported() {
        return 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): carousel.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$c = 'carousel';
    const DATA_KEY$8 = 'bs.carousel';
    const EVENT_KEY$8 = `.${DATA_KEY$8}`;
    const DATA_API_KEY$5 = '.data-api';
    const ARROW_LEFT_KEY$1 = 'ArrowLeft';
    const ARROW_RIGHT_KEY$1 = 'ArrowRight';
    const TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

    const ORDER_NEXT = 'next';
    const ORDER_PREV = 'prev';
    const DIRECTION_LEFT = 'left';
    const DIRECTION_RIGHT = 'right';
    const EVENT_SLIDE = `slide${EVENT_KEY$8}`;
    const EVENT_SLID = `slid${EVENT_KEY$8}`;
    const EVENT_KEYDOWN$1 = `keydown${EVENT_KEY$8}`;
    const EVENT_MOUSEENTER$1 = `mouseenter${EVENT_KEY$8}`;
    const EVENT_MOUSELEAVE$1 = `mouseleave${EVENT_KEY$8}`;
    const EVENT_DRAG_START = `dragstart${EVENT_KEY$8}`;
    const EVENT_LOAD_DATA_API$3 = `load${EVENT_KEY$8}${DATA_API_KEY$5}`;
    const EVENT_CLICK_DATA_API$5 = `click${EVENT_KEY$8}${DATA_API_KEY$5}`;
    const CLASS_NAME_CAROUSEL = 'carousel';
    const CLASS_NAME_ACTIVE$2 = 'active';
    const CLASS_NAME_SLIDE = 'slide';
    const CLASS_NAME_END = 'carousel-item-end';
    const CLASS_NAME_START = 'carousel-item-start';
    const CLASS_NAME_NEXT = 'carousel-item-next';
    const CLASS_NAME_PREV = 'carousel-item-prev';
    const SELECTOR_ACTIVE = '.active';
    const SELECTOR_ITEM = '.carousel-item';
    const SELECTOR_ACTIVE_ITEM = SELECTOR_ACTIVE + SELECTOR_ITEM;
    const SELECTOR_ITEM_IMG = '.carousel-item img';
    const SELECTOR_INDICATORS = '.carousel-indicators';
    const SELECTOR_DATA_SLIDE = '[data-bs-slide], [data-bs-slide-to]';
    const SELECTOR_DATA_RIDE = '[data-bs-ride="carousel"]';
    const KEY_TO_DIRECTION = {
      [ARROW_LEFT_KEY$1]: DIRECTION_RIGHT,
      [ARROW_RIGHT_KEY$1]: DIRECTION_LEFT
    };
    const Default$b = {
      interval: 5000,
      keyboard: true,
      pause: 'hover',
      ride: false,
      touch: true,
      wrap: true
    };
    const DefaultType$b = {
      interval: '(number|boolean)',
      // TODO:v6 remove boolean support
      keyboard: 'boolean',
      pause: '(string|boolean)',
      ride: '(boolean|string)',
      touch: 'boolean',
      wrap: 'boolean'
    };
    /**
     * Class definition
     */

    class Carousel extends BaseComponent {
      constructor(element, config) {
        super(element, config);
        this._interval = null;
        this._activeElement = null;
        this._isSliding = false;
        this.touchTimeout = null;
        this._swipeHelper = null;
        this._indicatorsElement = SelectorEngine.findOne(SELECTOR_INDICATORS, this._element);

        this._addEventListeners();

        if (this._config.ride === CLASS_NAME_CAROUSEL) {
          this.cycle();
        }
      } // Getters


      static get Default() {
        return Default$b;
      }

      static get DefaultType() {
        return DefaultType$b;
      }

      static get NAME() {
        return NAME$c;
      } // Public


      next() {
        this._slide(ORDER_NEXT);
      }

      nextWhenVisible() {
        // FIXME TODO use `document.visibilityState`
        // Don't call next when the page isn't visible
        // or the carousel or its parent isn't visible
        if (!document.hidden && isVisible(this._element)) {
          this.next();
        }
      }

      prev() {
        this._slide(ORDER_PREV);
      }

      pause() {
        if (this._isSliding) {
          triggerTransitionEnd(this._element);
        }

        this._clearInterval();
      }

      cycle() {
        this._clearInterval();

        this._updateInterval();

        this._interval = setInterval(() => this.nextWhenVisible(), this._config.interval);
      }

      _maybeEnableCycle() {
        if (!this._config.ride) {
          return;
        }

        if (this._isSliding) {
          EventHandler.one(this._element, EVENT_SLID, () => this.cycle());
          return;
        }

        this.cycle();
      }

      to(index) {
        const items = this._getItems();

        if (index > items.length - 1 || index < 0) {
          return;
        }

        if (this._isSliding) {
          EventHandler.one(this._element, EVENT_SLID, () => this.to(index));
          return;
        }

        const activeIndex = this._getItemIndex(this._getActive());

        if (activeIndex === index) {
          return;
        }

        const order = index > activeIndex ? ORDER_NEXT : ORDER_PREV;

        this._slide(order, items[index]);
      }

      dispose() {
        if (this._swipeHelper) {
          this._swipeHelper.dispose();
        }

        super.dispose();
      } // Private


      _configAfterMerge(config) {
        config.defaultInterval = config.interval;
        return config;
      }

      _addEventListeners() {
        if (this._config.keyboard) {
          EventHandler.on(this._element, EVENT_KEYDOWN$1, event => this._keydown(event));
        }

        if (this._config.pause === 'hover') {
          EventHandler.on(this._element, EVENT_MOUSEENTER$1, () => this.pause());
          EventHandler.on(this._element, EVENT_MOUSELEAVE$1, () => this._maybeEnableCycle());
        }

        if (this._config.touch && Swipe.isSupported()) {
          this._addTouchEventListeners();
        }
      }

      _addTouchEventListeners() {
        for (const img of SelectorEngine.find(SELECTOR_ITEM_IMG, this._element)) {
          EventHandler.on(img, EVENT_DRAG_START, event => event.preventDefault());
        }

        const endCallBack = () => {
          if (this._config.pause !== 'hover') {
            return;
          } // If it's a touch-enabled device, mouseenter/leave are fired as
          // part of the mouse compatibility events on first tap - the carousel
          // would stop cycling until user tapped out of it;
          // here, we listen for touchend, explicitly pause the carousel
          // (as if it's the second time we tap on it, mouseenter compat event
          // is NOT fired) and after a timeout (to allow for mouse compatibility
          // events to fire) we explicitly restart cycling


          this.pause();

          if (this.touchTimeout) {
            clearTimeout(this.touchTimeout);
          }

          this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), TOUCHEVENT_COMPAT_WAIT + this._config.interval);
        };

        const swipeConfig = {
          leftCallback: () => this._slide(this._directionToOrder(DIRECTION_LEFT)),
          rightCallback: () => this._slide(this._directionToOrder(DIRECTION_RIGHT)),
          endCallback: endCallBack
        };
        this._swipeHelper = new Swipe(this._element, swipeConfig);
      }

      _keydown(event) {
        if (/input|textarea/i.test(event.target.tagName)) {
          return;
        }

        const direction = KEY_TO_DIRECTION[event.key];

        if (direction) {
          event.preventDefault();

          this._slide(this._directionToOrder(direction));
        }
      }

      _getItemIndex(element) {
        return this._getItems().indexOf(element);
      }

      _setActiveIndicatorElement(index) {
        if (!this._indicatorsElement) {
          return;
        }

        const activeIndicator = SelectorEngine.findOne(SELECTOR_ACTIVE, this._indicatorsElement);
        activeIndicator.classList.remove(CLASS_NAME_ACTIVE$2);
        activeIndicator.removeAttribute('aria-current');
        const newActiveIndicator = SelectorEngine.findOne(`[data-bs-slide-to="${index}"]`, this._indicatorsElement);

        if (newActiveIndicator) {
          newActiveIndicator.classList.add(CLASS_NAME_ACTIVE$2);
          newActiveIndicator.setAttribute('aria-current', 'true');
        }
      }

      _updateInterval() {
        const element = this._activeElement || this._getActive();

        if (!element) {
          return;
        }

        const elementInterval = Number.parseInt(element.getAttribute('data-bs-interval'), 10);
        this._config.interval = elementInterval || this._config.defaultInterval;
      }

      _slide(order, element = null) {
        if (this._isSliding) {
          return;
        }

        const activeElement = this._getActive();

        const isNext = order === ORDER_NEXT;
        const nextElement = element || getNextActiveElement(this._getItems(), activeElement, isNext, this._config.wrap);

        if (nextElement === activeElement) {
          return;
        }

        const nextElementIndex = this._getItemIndex(nextElement);

        const triggerEvent = eventName => {
          return EventHandler.trigger(this._element, eventName, {
            relatedTarget: nextElement,
            direction: this._orderToDirection(order),
            from: this._getItemIndex(activeElement),
            to: nextElementIndex
          });
        };

        const slideEvent = triggerEvent(EVENT_SLIDE);

        if (slideEvent.defaultPrevented) {
          return;
        }

        if (!activeElement || !nextElement) {
          // Some weirdness is happening, so we bail
          // todo: change tests that use empty divs to avoid this check
          return;
        }

        const isCycling = Boolean(this._interval);
        this.pause();
        this._isSliding = true;

        this._setActiveIndicatorElement(nextElementIndex);

        this._activeElement = nextElement;
        const directionalClassName = isNext ? CLASS_NAME_START : CLASS_NAME_END;
        const orderClassName = isNext ? CLASS_NAME_NEXT : CLASS_NAME_PREV;
        nextElement.classList.add(orderClassName);
        reflow(nextElement);
        activeElement.classList.add(directionalClassName);
        nextElement.classList.add(directionalClassName);

        const completeCallBack = () => {
          nextElement.classList.remove(directionalClassName, orderClassName);
          nextElement.classList.add(CLASS_NAME_ACTIVE$2);
          activeElement.classList.remove(CLASS_NAME_ACTIVE$2, orderClassName, directionalClassName);
          this._isSliding = false;
          triggerEvent(EVENT_SLID);
        };

        this._queueCallback(completeCallBack, activeElement, this._isAnimated());

        if (isCycling) {
          this.cycle();
        }
      }

      _isAnimated() {
        return this._element.classList.contains(CLASS_NAME_SLIDE);
      }

      _getActive() {
        return SelectorEngine.findOne(SELECTOR_ACTIVE_ITEM, this._element);
      }

      _getItems() {
        return SelectorEngine.find(SELECTOR_ITEM, this._element);
      }

      _clearInterval() {
        if (this._interval) {
          clearInterval(this._interval);
          this._interval = null;
        }
      }

      _directionToOrder(direction) {
        if (isRTL()) {
          return direction === DIRECTION_LEFT ? ORDER_PREV : ORDER_NEXT;
        }

        return direction === DIRECTION_LEFT ? ORDER_NEXT : ORDER_PREV;
      }

      _orderToDirection(order) {
        if (isRTL()) {
          return order === ORDER_PREV ? DIRECTION_LEFT : DIRECTION_RIGHT;
        }

        return order === ORDER_PREV ? DIRECTION_RIGHT : DIRECTION_LEFT;
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Carousel.getOrCreateInstance(this, config);

          if (typeof config === 'number') {
            data.to(config);
            return;
          }

          if (typeof config === 'string') {
            if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
              throw new TypeError(`No method named "${config}"`);
            }

            data[config]();
          }
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_CLICK_DATA_API$5, SELECTOR_DATA_SLIDE, function (event) {
      const target = getElementFromSelector(this);

      if (!target || !target.classList.contains(CLASS_NAME_CAROUSEL)) {
        return;
      }

      event.preventDefault();
      const carousel = Carousel.getOrCreateInstance(target);
      const slideIndex = this.getAttribute('data-bs-slide-to');

      if (slideIndex) {
        carousel.to(slideIndex);

        carousel._maybeEnableCycle();

        return;
      }

      if (Manipulator.getDataAttribute(this, 'slide') === 'next') {
        carousel.next();

        carousel._maybeEnableCycle();

        return;
      }

      carousel.prev();

      carousel._maybeEnableCycle();
    });
    EventHandler.on(window, EVENT_LOAD_DATA_API$3, () => {
      const carousels = SelectorEngine.find(SELECTOR_DATA_RIDE);

      for (const carousel of carousels) {
        Carousel.getOrCreateInstance(carousel);
      }
    });
    /**
     * jQuery
     */

    defineJQueryPlugin(Carousel);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): collapse.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$b = 'collapse';
    const DATA_KEY$7 = 'bs.collapse';
    const EVENT_KEY$7 = `.${DATA_KEY$7}`;
    const DATA_API_KEY$4 = '.data-api';
    const EVENT_SHOW$6 = `show${EVENT_KEY$7}`;
    const EVENT_SHOWN$6 = `shown${EVENT_KEY$7}`;
    const EVENT_HIDE$6 = `hide${EVENT_KEY$7}`;
    const EVENT_HIDDEN$6 = `hidden${EVENT_KEY$7}`;
    const EVENT_CLICK_DATA_API$4 = `click${EVENT_KEY$7}${DATA_API_KEY$4}`;
    const CLASS_NAME_SHOW$7 = 'show';
    const CLASS_NAME_COLLAPSE = 'collapse';
    const CLASS_NAME_COLLAPSING = 'collapsing';
    const CLASS_NAME_COLLAPSED = 'collapsed';
    const CLASS_NAME_DEEPER_CHILDREN = `:scope .${CLASS_NAME_COLLAPSE} .${CLASS_NAME_COLLAPSE}`;
    const CLASS_NAME_HORIZONTAL = 'collapse-horizontal';
    const WIDTH = 'width';
    const HEIGHT = 'height';
    const SELECTOR_ACTIVES = '.collapse.show, .collapse.collapsing';
    const SELECTOR_DATA_TOGGLE$4 = '[data-bs-toggle="collapse"]';
    const Default$a = {
      parent: null,
      toggle: true
    };
    const DefaultType$a = {
      parent: '(null|element)',
      toggle: 'boolean'
    };
    /**
     * Class definition
     */

    class Collapse extends BaseComponent {
      constructor(element, config) {
        super(element, config);
        this._isTransitioning = false;
        this._triggerArray = [];
        const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE$4);

        for (const elem of toggleList) {
          const selector = getSelectorFromElement(elem);
          const filterElement = SelectorEngine.find(selector).filter(foundElement => foundElement === this._element);

          if (selector !== null && filterElement.length) {
            this._triggerArray.push(elem);
          }
        }

        this._initializeChildren();

        if (!this._config.parent) {
          this._addAriaAndCollapsedClass(this._triggerArray, this._isShown());
        }

        if (this._config.toggle) {
          this.toggle();
        }
      } // Getters


      static get Default() {
        return Default$a;
      }

      static get DefaultType() {
        return DefaultType$a;
      }

      static get NAME() {
        return NAME$b;
      } // Public


      toggle() {
        if (this._isShown()) {
          this.hide();
        } else {
          this.show();
        }
      }

      show() {
        if (this._isTransitioning || this._isShown()) {
          return;
        }

        let activeChildren = []; // find active children

        if (this._config.parent) {
          activeChildren = this._getFirstLevelChildren(SELECTOR_ACTIVES).filter(element => element !== this._element).map(element => Collapse.getOrCreateInstance(element, {
            toggle: false
          }));
        }

        if (activeChildren.length && activeChildren[0]._isTransitioning) {
          return;
        }

        const startEvent = EventHandler.trigger(this._element, EVENT_SHOW$6);

        if (startEvent.defaultPrevented) {
          return;
        }

        for (const activeInstance of activeChildren) {
          activeInstance.hide();
        }

        const dimension = this._getDimension();

        this._element.classList.remove(CLASS_NAME_COLLAPSE);

        this._element.classList.add(CLASS_NAME_COLLAPSING);

        this._element.style[dimension] = 0;

        this._addAriaAndCollapsedClass(this._triggerArray, true);

        this._isTransitioning = true;

        const complete = () => {
          this._isTransitioning = false;

          this._element.classList.remove(CLASS_NAME_COLLAPSING);

          this._element.classList.add(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);

          this._element.style[dimension] = '';
          EventHandler.trigger(this._element, EVENT_SHOWN$6);
        };

        const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
        const scrollSize = `scroll${capitalizedDimension}`;

        this._queueCallback(complete, this._element, true);

        this._element.style[dimension] = `${this._element[scrollSize]}px`;
      }

      hide() {
        if (this._isTransitioning || !this._isShown()) {
          return;
        }

        const startEvent = EventHandler.trigger(this._element, EVENT_HIDE$6);

        if (startEvent.defaultPrevented) {
          return;
        }

        const dimension = this._getDimension();

        this._element.style[dimension] = `${this._element.getBoundingClientRect()[dimension]}px`;
        reflow(this._element);

        this._element.classList.add(CLASS_NAME_COLLAPSING);

        this._element.classList.remove(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);

        for (const trigger of this._triggerArray) {
          const element = getElementFromSelector(trigger);

          if (element && !this._isShown(element)) {
            this._addAriaAndCollapsedClass([trigger], false);
          }
        }

        this._isTransitioning = true;

        const complete = () => {
          this._isTransitioning = false;

          this._element.classList.remove(CLASS_NAME_COLLAPSING);

          this._element.classList.add(CLASS_NAME_COLLAPSE);

          EventHandler.trigger(this._element, EVENT_HIDDEN$6);
        };

        this._element.style[dimension] = '';

        this._queueCallback(complete, this._element, true);
      }

      _isShown(element = this._element) {
        return element.classList.contains(CLASS_NAME_SHOW$7);
      } // Private


      _configAfterMerge(config) {
        config.toggle = Boolean(config.toggle); // Coerce string values

        config.parent = getElement(config.parent);
        return config;
      }

      _getDimension() {
        return this._element.classList.contains(CLASS_NAME_HORIZONTAL) ? WIDTH : HEIGHT;
      }

      _initializeChildren() {
        if (!this._config.parent) {
          return;
        }

        const children = this._getFirstLevelChildren(SELECTOR_DATA_TOGGLE$4);

        for (const element of children) {
          const selected = getElementFromSelector(element);

          if (selected) {
            this._addAriaAndCollapsedClass([element], this._isShown(selected));
          }
        }
      }

      _getFirstLevelChildren(selector) {
        const children = SelectorEngine.find(CLASS_NAME_DEEPER_CHILDREN, this._config.parent); // remove children if greater depth

        return SelectorEngine.find(selector, this._config.parent).filter(element => !children.includes(element));
      }

      _addAriaAndCollapsedClass(triggerArray, isOpen) {
        if (!triggerArray.length) {
          return;
        }

        for (const element of triggerArray) {
          element.classList.toggle(CLASS_NAME_COLLAPSED, !isOpen);
          element.setAttribute('aria-expanded', isOpen);
        }
      } // Static


      static jQueryInterface(config) {
        const _config = {};

        if (typeof config === 'string' && /show|hide/.test(config)) {
          _config.toggle = false;
        }

        return this.each(function () {
          const data = Collapse.getOrCreateInstance(this, _config);

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError(`No method named "${config}"`);
            }

            data[config]();
          }
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_CLICK_DATA_API$4, SELECTOR_DATA_TOGGLE$4, function (event) {
      // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
      if (event.target.tagName === 'A' || event.delegateTarget && event.delegateTarget.tagName === 'A') {
        event.preventDefault();
      }

      const selector = getSelectorFromElement(this);
      const selectorElements = SelectorEngine.find(selector);

      for (const element of selectorElements) {
        Collapse.getOrCreateInstance(element, {
          toggle: false
        }).toggle();
      }
    });
    /**
     * jQuery
     */

    defineJQueryPlugin(Collapse);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): dropdown.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$a = 'dropdown';
    const DATA_KEY$6 = 'bs.dropdown';
    const EVENT_KEY$6 = `.${DATA_KEY$6}`;
    const DATA_API_KEY$3 = '.data-api';
    const ESCAPE_KEY$2 = 'Escape';
    const TAB_KEY$1 = 'Tab';
    const ARROW_UP_KEY$1 = 'ArrowUp';
    const ARROW_DOWN_KEY$1 = 'ArrowDown';
    const RIGHT_MOUSE_BUTTON = 2; // MouseEvent.button value for the secondary button, usually the right button

    const EVENT_HIDE$5 = `hide${EVENT_KEY$6}`;
    const EVENT_HIDDEN$5 = `hidden${EVENT_KEY$6}`;
    const EVENT_SHOW$5 = `show${EVENT_KEY$6}`;
    const EVENT_SHOWN$5 = `shown${EVENT_KEY$6}`;
    const EVENT_CLICK_DATA_API$3 = `click${EVENT_KEY$6}${DATA_API_KEY$3}`;
    const EVENT_KEYDOWN_DATA_API = `keydown${EVENT_KEY$6}${DATA_API_KEY$3}`;
    const EVENT_KEYUP_DATA_API = `keyup${EVENT_KEY$6}${DATA_API_KEY$3}`;
    const CLASS_NAME_SHOW$6 = 'show';
    const CLASS_NAME_DROPUP = 'dropup';
    const CLASS_NAME_DROPEND = 'dropend';
    const CLASS_NAME_DROPSTART = 'dropstart';
    const CLASS_NAME_DROPUP_CENTER = 'dropup-center';
    const CLASS_NAME_DROPDOWN_CENTER = 'dropdown-center';
    const SELECTOR_DATA_TOGGLE$3 = '[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)';
    const SELECTOR_DATA_TOGGLE_SHOWN = `${SELECTOR_DATA_TOGGLE$3}.${CLASS_NAME_SHOW$6}`;
    const SELECTOR_MENU = '.dropdown-menu';
    const SELECTOR_NAVBAR = '.navbar';
    const SELECTOR_NAVBAR_NAV = '.navbar-nav';
    const SELECTOR_VISIBLE_ITEMS = '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)';
    const PLACEMENT_TOP = isRTL() ? 'top-end' : 'top-start';
    const PLACEMENT_TOPEND = isRTL() ? 'top-start' : 'top-end';
    const PLACEMENT_BOTTOM = isRTL() ? 'bottom-end' : 'bottom-start';
    const PLACEMENT_BOTTOMEND = isRTL() ? 'bottom-start' : 'bottom-end';
    const PLACEMENT_RIGHT = isRTL() ? 'left-start' : 'right-start';
    const PLACEMENT_LEFT = isRTL() ? 'right-start' : 'left-start';
    const PLACEMENT_TOPCENTER = 'top';
    const PLACEMENT_BOTTOMCENTER = 'bottom';
    const Default$9 = {
      autoClose: true,
      boundary: 'clippingParents',
      display: 'dynamic',
      offset: [0, 2],
      popperConfig: null,
      reference: 'toggle'
    };
    const DefaultType$9 = {
      autoClose: '(boolean|string)',
      boundary: '(string|element)',
      display: 'string',
      offset: '(array|string|function)',
      popperConfig: '(null|object|function)',
      reference: '(string|element|object)'
    };
    /**
     * Class definition
     */

    class Dropdown extends BaseComponent {
      constructor(element, config) {
        super(element, config);
        this._popper = null;
        this._parent = this._element.parentNode; // dropdown wrapper
        // todo: v6 revert #37011 & change markup https://getbootstrap.com/docs/5.2/forms/input-group/

        this._menu = SelectorEngine.next(this._element, SELECTOR_MENU)[0] || SelectorEngine.prev(this._element, SELECTOR_MENU)[0] || SelectorEngine.findOne(SELECTOR_MENU, this._parent);
        this._inNavbar = this._detectNavbar();
      } // Getters


      static get Default() {
        return Default$9;
      }

      static get DefaultType() {
        return DefaultType$9;
      }

      static get NAME() {
        return NAME$a;
      } // Public


      toggle() {
        return this._isShown() ? this.hide() : this.show();
      }

      show() {
        if (isDisabled(this._element) || this._isShown()) {
          return;
        }

        const relatedTarget = {
          relatedTarget: this._element
        };
        const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$5, relatedTarget);

        if (showEvent.defaultPrevented) {
          return;
        }

        this._createPopper(); // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


        if ('ontouchstart' in document.documentElement && !this._parent.closest(SELECTOR_NAVBAR_NAV)) {
          for (const element of [].concat(...document.body.children)) {
            EventHandler.on(element, 'mouseover', noop);
          }
        }

        this._element.focus();

        this._element.setAttribute('aria-expanded', true);

        this._menu.classList.add(CLASS_NAME_SHOW$6);

        this._element.classList.add(CLASS_NAME_SHOW$6);

        EventHandler.trigger(this._element, EVENT_SHOWN$5, relatedTarget);
      }

      hide() {
        if (isDisabled(this._element) || !this._isShown()) {
          return;
        }

        const relatedTarget = {
          relatedTarget: this._element
        };

        this._completeHide(relatedTarget);
      }

      dispose() {
        if (this._popper) {
          this._popper.destroy();
        }

        super.dispose();
      }

      update() {
        this._inNavbar = this._detectNavbar();

        if (this._popper) {
          this._popper.update();
        }
      } // Private


      _completeHide(relatedTarget) {
        const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$5, relatedTarget);

        if (hideEvent.defaultPrevented) {
          return;
        } // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support


        if ('ontouchstart' in document.documentElement) {
          for (const element of [].concat(...document.body.children)) {
            EventHandler.off(element, 'mouseover', noop);
          }
        }

        if (this._popper) {
          this._popper.destroy();
        }

        this._menu.classList.remove(CLASS_NAME_SHOW$6);

        this._element.classList.remove(CLASS_NAME_SHOW$6);

        this._element.setAttribute('aria-expanded', 'false');

        Manipulator.removeDataAttribute(this._menu, 'popper');
        EventHandler.trigger(this._element, EVENT_HIDDEN$5, relatedTarget);
      }

      _getConfig(config) {
        config = super._getConfig(config);

        if (typeof config.reference === 'object' && !isElement(config.reference) && typeof config.reference.getBoundingClientRect !== 'function') {
          // Popper virtual elements require a getBoundingClientRect method
          throw new TypeError(`${NAME$a.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
        }

        return config;
      }

      _createPopper() {
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap\'s dropdowns require Popper (https://popper.js.org)');
        }

        let referenceElement = this._element;

        if (this._config.reference === 'parent') {
          referenceElement = this._parent;
        } else if (isElement(this._config.reference)) {
          referenceElement = getElement(this._config.reference);
        } else if (typeof this._config.reference === 'object') {
          referenceElement = this._config.reference;
        }

        const popperConfig = this._getPopperConfig();

        this._popper = createPopper(referenceElement, this._menu, popperConfig);
      }

      _isShown() {
        return this._menu.classList.contains(CLASS_NAME_SHOW$6);
      }

      _getPlacement() {
        const parentDropdown = this._parent;

        if (parentDropdown.classList.contains(CLASS_NAME_DROPEND)) {
          return PLACEMENT_RIGHT;
        }

        if (parentDropdown.classList.contains(CLASS_NAME_DROPSTART)) {
          return PLACEMENT_LEFT;
        }

        if (parentDropdown.classList.contains(CLASS_NAME_DROPUP_CENTER)) {
          return PLACEMENT_TOPCENTER;
        }

        if (parentDropdown.classList.contains(CLASS_NAME_DROPDOWN_CENTER)) {
          return PLACEMENT_BOTTOMCENTER;
        } // We need to trim the value because custom properties can also include spaces


        const isEnd = getComputedStyle(this._menu).getPropertyValue('--bs-position').trim() === 'end';

        if (parentDropdown.classList.contains(CLASS_NAME_DROPUP)) {
          return isEnd ? PLACEMENT_TOPEND : PLACEMENT_TOP;
        }

        return isEnd ? PLACEMENT_BOTTOMEND : PLACEMENT_BOTTOM;
      }

      _detectNavbar() {
        return this._element.closest(SELECTOR_NAVBAR) !== null;
      }

      _getOffset() {
        const {
          offset
        } = this._config;

        if (typeof offset === 'string') {
          return offset.split(',').map(value => Number.parseInt(value, 10));
        }

        if (typeof offset === 'function') {
          return popperData => offset(popperData, this._element);
        }

        return offset;
      }

      _getPopperConfig() {
        const defaultBsPopperConfig = {
          placement: this._getPlacement(),
          modifiers: [{
            name: 'preventOverflow',
            options: {
              boundary: this._config.boundary
            }
          }, {
            name: 'offset',
            options: {
              offset: this._getOffset()
            }
          }]
        }; // Disable Popper if we have a static display or Dropdown is in Navbar

        if (this._inNavbar || this._config.display === 'static') {
          Manipulator.setDataAttribute(this._menu, 'popper', 'static'); // todo:v6 remove

          defaultBsPopperConfig.modifiers = [{
            name: 'applyStyles',
            enabled: false
          }];
        }

        return { ...defaultBsPopperConfig,
          ...(typeof this._config.popperConfig === 'function' ? this._config.popperConfig(defaultBsPopperConfig) : this._config.popperConfig)
        };
      }

      _selectMenuItem({
        key,
        target
      }) {
        const items = SelectorEngine.find(SELECTOR_VISIBLE_ITEMS, this._menu).filter(element => isVisible(element));

        if (!items.length) {
          return;
        } // if target isn't included in items (e.g. when expanding the dropdown)
        // allow cycling to get the last item in case key equals ARROW_UP_KEY


        getNextActiveElement(items, target, key === ARROW_DOWN_KEY$1, !items.includes(target)).focus();
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Dropdown.getOrCreateInstance(this, config);

          if (typeof config !== 'string') {
            return;
          }

          if (typeof data[config] === 'undefined') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config]();
        });
      }

      static clearMenus(event) {
        if (event.button === RIGHT_MOUSE_BUTTON || event.type === 'keyup' && event.key !== TAB_KEY$1) {
          return;
        }

        const openToggles = SelectorEngine.find(SELECTOR_DATA_TOGGLE_SHOWN);

        for (const toggle of openToggles) {
          const context = Dropdown.getInstance(toggle);

          if (!context || context._config.autoClose === false) {
            continue;
          }

          const composedPath = event.composedPath();
          const isMenuTarget = composedPath.includes(context._menu);

          if (composedPath.includes(context._element) || context._config.autoClose === 'inside' && !isMenuTarget || context._config.autoClose === 'outside' && isMenuTarget) {
            continue;
          } // Tab navigation through the dropdown menu or events from contained inputs shouldn't close the menu


          if (context._menu.contains(event.target) && (event.type === 'keyup' && event.key === TAB_KEY$1 || /input|select|option|textarea|form/i.test(event.target.tagName))) {
            continue;
          }

          const relatedTarget = {
            relatedTarget: context._element
          };

          if (event.type === 'click') {
            relatedTarget.clickEvent = event;
          }

          context._completeHide(relatedTarget);
        }
      }

      static dataApiKeydownHandler(event) {
        // If not an UP | DOWN | ESCAPE key => not a dropdown command
        // If input/textarea && if key is other than ESCAPE => not a dropdown command
        const isInput = /input|textarea/i.test(event.target.tagName);
        const isEscapeEvent = event.key === ESCAPE_KEY$2;
        const isUpOrDownEvent = [ARROW_UP_KEY$1, ARROW_DOWN_KEY$1].includes(event.key);

        if (!isUpOrDownEvent && !isEscapeEvent) {
          return;
        }

        if (isInput && !isEscapeEvent) {
          return;
        }

        event.preventDefault(); // todo: v6 revert #37011 & change markup https://getbootstrap.com/docs/5.2/forms/input-group/

        const getToggleButton = this.matches(SELECTOR_DATA_TOGGLE$3) ? this : SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.next(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.findOne(SELECTOR_DATA_TOGGLE$3, event.delegateTarget.parentNode);
        const instance = Dropdown.getOrCreateInstance(getToggleButton);

        if (isUpOrDownEvent) {
          event.stopPropagation();
          instance.show();

          instance._selectMenuItem(event);

          return;
        }

        if (instance._isShown()) {
          // else is escape and we check if it is shown
          event.stopPropagation();
          instance.hide();
          getToggleButton.focus();
        }
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE$3, Dropdown.dataApiKeydownHandler);
    EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, Dropdown.dataApiKeydownHandler);
    EventHandler.on(document, EVENT_CLICK_DATA_API$3, Dropdown.clearMenus);
    EventHandler.on(document, EVENT_KEYUP_DATA_API, Dropdown.clearMenus);
    EventHandler.on(document, EVENT_CLICK_DATA_API$3, SELECTOR_DATA_TOGGLE$3, function (event) {
      event.preventDefault();
      Dropdown.getOrCreateInstance(this).toggle();
    });
    /**
     * jQuery
     */

    defineJQueryPlugin(Dropdown);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/scrollBar.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const SELECTOR_FIXED_CONTENT = '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top';
    const SELECTOR_STICKY_CONTENT = '.sticky-top';
    const PROPERTY_PADDING = 'padding-right';
    const PROPERTY_MARGIN = 'margin-right';
    /**
     * Class definition
     */

    class ScrollBarHelper {
      constructor() {
        this._element = document.body;
      } // Public


      getWidth() {
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth#usage_notes
        const documentWidth = document.documentElement.clientWidth;
        return Math.abs(window.innerWidth - documentWidth);
      }

      hide() {
        const width = this.getWidth();

        this._disableOverFlow(); // give padding to element to balance the hidden scrollbar width


        this._setElementAttributes(this._element, PROPERTY_PADDING, calculatedValue => calculatedValue + width); // trick: We adjust positive paddingRight and negative marginRight to sticky-top elements to keep showing fullwidth


        this._setElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING, calculatedValue => calculatedValue + width);

        this._setElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN, calculatedValue => calculatedValue - width);
      }

      reset() {
        this._resetElementAttributes(this._element, 'overflow');

        this._resetElementAttributes(this._element, PROPERTY_PADDING);

        this._resetElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING);

        this._resetElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN);
      }

      isOverflowing() {
        return this.getWidth() > 0;
      } // Private


      _disableOverFlow() {
        this._saveInitialAttribute(this._element, 'overflow');

        this._element.style.overflow = 'hidden';
      }

      _setElementAttributes(selector, styleProperty, callback) {
        const scrollbarWidth = this.getWidth();

        const manipulationCallBack = element => {
          if (element !== this._element && window.innerWidth > element.clientWidth + scrollbarWidth) {
            return;
          }

          this._saveInitialAttribute(element, styleProperty);

          const calculatedValue = window.getComputedStyle(element).getPropertyValue(styleProperty);
          element.style.setProperty(styleProperty, `${callback(Number.parseFloat(calculatedValue))}px`);
        };

        this._applyManipulationCallback(selector, manipulationCallBack);
      }

      _saveInitialAttribute(element, styleProperty) {
        const actualValue = element.style.getPropertyValue(styleProperty);

        if (actualValue) {
          Manipulator.setDataAttribute(element, styleProperty, actualValue);
        }
      }

      _resetElementAttributes(selector, styleProperty) {
        const manipulationCallBack = element => {
          const value = Manipulator.getDataAttribute(element, styleProperty); // We only want to remove the property if the value is `null`; the value can also be zero

          if (value === null) {
            element.style.removeProperty(styleProperty);
            return;
          }

          Manipulator.removeDataAttribute(element, styleProperty);
          element.style.setProperty(styleProperty, value);
        };

        this._applyManipulationCallback(selector, manipulationCallBack);
      }

      _applyManipulationCallback(selector, callBack) {
        if (isElement(selector)) {
          callBack(selector);
          return;
        }

        for (const sel of SelectorEngine.find(selector, this._element)) {
          callBack(sel);
        }
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/backdrop.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$9 = 'backdrop';
    const CLASS_NAME_FADE$4 = 'fade';
    const CLASS_NAME_SHOW$5 = 'show';
    const EVENT_MOUSEDOWN = `mousedown.bs.${NAME$9}`;
    const Default$8 = {
      className: 'modal-backdrop',
      clickCallback: null,
      isAnimated: false,
      isVisible: true,
      // if false, we use the backdrop helper without adding any element to the dom
      rootElement: 'body' // give the choice to place backdrop under different elements

    };
    const DefaultType$8 = {
      className: 'string',
      clickCallback: '(function|null)',
      isAnimated: 'boolean',
      isVisible: 'boolean',
      rootElement: '(element|string)'
    };
    /**
     * Class definition
     */

    class Backdrop extends Config {
      constructor(config) {
        super();
        this._config = this._getConfig(config);
        this._isAppended = false;
        this._element = null;
      } // Getters


      static get Default() {
        return Default$8;
      }

      static get DefaultType() {
        return DefaultType$8;
      }

      static get NAME() {
        return NAME$9;
      } // Public


      show(callback) {
        if (!this._config.isVisible) {
          execute(callback);
          return;
        }

        this._append();

        const element = this._getElement();

        if (this._config.isAnimated) {
          reflow(element);
        }

        element.classList.add(CLASS_NAME_SHOW$5);

        this._emulateAnimation(() => {
          execute(callback);
        });
      }

      hide(callback) {
        if (!this._config.isVisible) {
          execute(callback);
          return;
        }

        this._getElement().classList.remove(CLASS_NAME_SHOW$5);

        this._emulateAnimation(() => {
          this.dispose();
          execute(callback);
        });
      }

      dispose() {
        if (!this._isAppended) {
          return;
        }

        EventHandler.off(this._element, EVENT_MOUSEDOWN);

        this._element.remove();

        this._isAppended = false;
      } // Private


      _getElement() {
        if (!this._element) {
          const backdrop = document.createElement('div');
          backdrop.className = this._config.className;

          if (this._config.isAnimated) {
            backdrop.classList.add(CLASS_NAME_FADE$4);
          }

          this._element = backdrop;
        }

        return this._element;
      }

      _configAfterMerge(config) {
        // use getElement() with the default "body" to get a fresh Element on each instantiation
        config.rootElement = getElement(config.rootElement);
        return config;
      }

      _append() {
        if (this._isAppended) {
          return;
        }

        const element = this._getElement();

        this._config.rootElement.append(element);

        EventHandler.on(element, EVENT_MOUSEDOWN, () => {
          execute(this._config.clickCallback);
        });
        this._isAppended = true;
      }

      _emulateAnimation(callback) {
        executeAfterTransition(callback, this._getElement(), this._config.isAnimated);
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/focustrap.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$8 = 'focustrap';
    const DATA_KEY$5 = 'bs.focustrap';
    const EVENT_KEY$5 = `.${DATA_KEY$5}`;
    const EVENT_FOCUSIN$2 = `focusin${EVENT_KEY$5}`;
    const EVENT_KEYDOWN_TAB = `keydown.tab${EVENT_KEY$5}`;
    const TAB_KEY = 'Tab';
    const TAB_NAV_FORWARD = 'forward';
    const TAB_NAV_BACKWARD = 'backward';
    const Default$7 = {
      autofocus: true,
      trapElement: null // The element to trap focus inside of

    };
    const DefaultType$7 = {
      autofocus: 'boolean',
      trapElement: 'element'
    };
    /**
     * Class definition
     */

    class FocusTrap extends Config {
      constructor(config) {
        super();
        this._config = this._getConfig(config);
        this._isActive = false;
        this._lastTabNavDirection = null;
      } // Getters


      static get Default() {
        return Default$7;
      }

      static get DefaultType() {
        return DefaultType$7;
      }

      static get NAME() {
        return NAME$8;
      } // Public


      activate() {
        if (this._isActive) {
          return;
        }

        if (this._config.autofocus) {
          this._config.trapElement.focus();
        }

        EventHandler.off(document, EVENT_KEY$5); // guard against infinite focus loop

        EventHandler.on(document, EVENT_FOCUSIN$2, event => this._handleFocusin(event));
        EventHandler.on(document, EVENT_KEYDOWN_TAB, event => this._handleKeydown(event));
        this._isActive = true;
      }

      deactivate() {
        if (!this._isActive) {
          return;
        }

        this._isActive = false;
        EventHandler.off(document, EVENT_KEY$5);
      } // Private


      _handleFocusin(event) {
        const {
          trapElement
        } = this._config;

        if (event.target === document || event.target === trapElement || trapElement.contains(event.target)) {
          return;
        }

        const elements = SelectorEngine.focusableChildren(trapElement);

        if (elements.length === 0) {
          trapElement.focus();
        } else if (this._lastTabNavDirection === TAB_NAV_BACKWARD) {
          elements[elements.length - 1].focus();
        } else {
          elements[0].focus();
        }
      }

      _handleKeydown(event) {
        if (event.key !== TAB_KEY) {
          return;
        }

        this._lastTabNavDirection = event.shiftKey ? TAB_NAV_BACKWARD : TAB_NAV_FORWARD;
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): modal.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$7 = 'modal';
    const DATA_KEY$4 = 'bs.modal';
    const EVENT_KEY$4 = `.${DATA_KEY$4}`;
    const DATA_API_KEY$2 = '.data-api';
    const ESCAPE_KEY$1 = 'Escape';
    const EVENT_HIDE$4 = `hide${EVENT_KEY$4}`;
    const EVENT_HIDE_PREVENTED$1 = `hidePrevented${EVENT_KEY$4}`;
    const EVENT_HIDDEN$4 = `hidden${EVENT_KEY$4}`;
    const EVENT_SHOW$4 = `show${EVENT_KEY$4}`;
    const EVENT_SHOWN$4 = `shown${EVENT_KEY$4}`;
    const EVENT_RESIZE$1 = `resize${EVENT_KEY$4}`;
    const EVENT_CLICK_DISMISS = `click.dismiss${EVENT_KEY$4}`;
    const EVENT_MOUSEDOWN_DISMISS = `mousedown.dismiss${EVENT_KEY$4}`;
    const EVENT_KEYDOWN_DISMISS$1 = `keydown.dismiss${EVENT_KEY$4}`;
    const EVENT_CLICK_DATA_API$2 = `click${EVENT_KEY$4}${DATA_API_KEY$2}`;
    const CLASS_NAME_OPEN = 'modal-open';
    const CLASS_NAME_FADE$3 = 'fade';
    const CLASS_NAME_SHOW$4 = 'show';
    const CLASS_NAME_STATIC = 'modal-static';
    const OPEN_SELECTOR$1 = '.modal.show';
    const SELECTOR_DIALOG = '.modal-dialog';
    const SELECTOR_MODAL_BODY = '.modal-body';
    const SELECTOR_DATA_TOGGLE$2 = '[data-bs-toggle="modal"]';
    const Default$6 = {
      backdrop: true,
      focus: true,
      keyboard: true
    };
    const DefaultType$6 = {
      backdrop: '(boolean|string)',
      focus: 'boolean',
      keyboard: 'boolean'
    };
    /**
     * Class definition
     */

    class Modal extends BaseComponent {
      constructor(element, config) {
        super(element, config);
        this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, this._element);
        this._backdrop = this._initializeBackDrop();
        this._focustrap = this._initializeFocusTrap();
        this._isShown = false;
        this._isTransitioning = false;
        this._scrollBar = new ScrollBarHelper();

        this._addEventListeners();
      } // Getters


      static get Default() {
        return Default$6;
      }

      static get DefaultType() {
        return DefaultType$6;
      }

      static get NAME() {
        return NAME$7;
      } // Public


      toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      }

      show(relatedTarget) {
        if (this._isShown || this._isTransitioning) {
          return;
        }

        const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$4, {
          relatedTarget
        });

        if (showEvent.defaultPrevented) {
          return;
        }

        this._isShown = true;
        this._isTransitioning = true;

        this._scrollBar.hide();

        document.body.classList.add(CLASS_NAME_OPEN);

        this._adjustDialog();

        this._backdrop.show(() => this._showElement(relatedTarget));
      }

      hide() {
        if (!this._isShown || this._isTransitioning) {
          return;
        }

        const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$4);

        if (hideEvent.defaultPrevented) {
          return;
        }

        this._isShown = false;
        this._isTransitioning = true;

        this._focustrap.deactivate();

        this._element.classList.remove(CLASS_NAME_SHOW$4);

        this._queueCallback(() => this._hideModal(), this._element, this._isAnimated());
      }

      dispose() {
        for (const htmlElement of [window, this._dialog]) {
          EventHandler.off(htmlElement, EVENT_KEY$4);
        }

        this._backdrop.dispose();

        this._focustrap.deactivate();

        super.dispose();
      }

      handleUpdate() {
        this._adjustDialog();
      } // Private


      _initializeBackDrop() {
        return new Backdrop({
          isVisible: Boolean(this._config.backdrop),
          // 'static' option will be translated to true, and booleans will keep their value,
          isAnimated: this._isAnimated()
        });
      }

      _initializeFocusTrap() {
        return new FocusTrap({
          trapElement: this._element
        });
      }

      _showElement(relatedTarget) {
        // try to append dynamic modal
        if (!document.body.contains(this._element)) {
          document.body.append(this._element);
        }

        this._element.style.display = 'block';

        this._element.removeAttribute('aria-hidden');

        this._element.setAttribute('aria-modal', true);

        this._element.setAttribute('role', 'dialog');

        this._element.scrollTop = 0;
        const modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog);

        if (modalBody) {
          modalBody.scrollTop = 0;
        }

        reflow(this._element);

        this._element.classList.add(CLASS_NAME_SHOW$4);

        const transitionComplete = () => {
          if (this._config.focus) {
            this._focustrap.activate();
          }

          this._isTransitioning = false;
          EventHandler.trigger(this._element, EVENT_SHOWN$4, {
            relatedTarget
          });
        };

        this._queueCallback(transitionComplete, this._dialog, this._isAnimated());
      }

      _addEventListeners() {
        EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS$1, event => {
          if (event.key !== ESCAPE_KEY$1) {
            return;
          }

          if (this._config.keyboard) {
            event.preventDefault();
            this.hide();
            return;
          }

          this._triggerBackdropTransition();
        });
        EventHandler.on(window, EVENT_RESIZE$1, () => {
          if (this._isShown && !this._isTransitioning) {
            this._adjustDialog();
          }
        });
        EventHandler.on(this._element, EVENT_MOUSEDOWN_DISMISS, event => {
          // a bad trick to segregate clicks that may start inside dialog but end outside, and avoid listen to scrollbar clicks
          EventHandler.one(this._element, EVENT_CLICK_DISMISS, event2 => {
            if (this._element !== event.target || this._element !== event2.target) {
              return;
            }

            if (this._config.backdrop === 'static') {
              this._triggerBackdropTransition();

              return;
            }

            if (this._config.backdrop) {
              this.hide();
            }
          });
        });
      }

      _hideModal() {
        this._element.style.display = 'none';

        this._element.setAttribute('aria-hidden', true);

        this._element.removeAttribute('aria-modal');

        this._element.removeAttribute('role');

        this._isTransitioning = false;

        this._backdrop.hide(() => {
          document.body.classList.remove(CLASS_NAME_OPEN);

          this._resetAdjustments();

          this._scrollBar.reset();

          EventHandler.trigger(this._element, EVENT_HIDDEN$4);
        });
      }

      _isAnimated() {
        return this._element.classList.contains(CLASS_NAME_FADE$3);
      }

      _triggerBackdropTransition() {
        const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED$1);

        if (hideEvent.defaultPrevented) {
          return;
        }

        const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;
        const initialOverflowY = this._element.style.overflowY; // return if the following background transition hasn't yet completed

        if (initialOverflowY === 'hidden' || this._element.classList.contains(CLASS_NAME_STATIC)) {
          return;
        }

        if (!isModalOverflowing) {
          this._element.style.overflowY = 'hidden';
        }

        this._element.classList.add(CLASS_NAME_STATIC);

        this._queueCallback(() => {
          this._element.classList.remove(CLASS_NAME_STATIC);

          this._queueCallback(() => {
            this._element.style.overflowY = initialOverflowY;
          }, this._dialog);
        }, this._dialog);

        this._element.focus();
      }
      /**
       * The following methods are used to handle overflowing modals
       */


      _adjustDialog() {
        const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

        const scrollbarWidth = this._scrollBar.getWidth();

        const isBodyOverflowing = scrollbarWidth > 0;

        if (isBodyOverflowing && !isModalOverflowing) {
          const property = isRTL() ? 'paddingLeft' : 'paddingRight';
          this._element.style[property] = `${scrollbarWidth}px`;
        }

        if (!isBodyOverflowing && isModalOverflowing) {
          const property = isRTL() ? 'paddingRight' : 'paddingLeft';
          this._element.style[property] = `${scrollbarWidth}px`;
        }
      }

      _resetAdjustments() {
        this._element.style.paddingLeft = '';
        this._element.style.paddingRight = '';
      } // Static


      static jQueryInterface(config, relatedTarget) {
        return this.each(function () {
          const data = Modal.getOrCreateInstance(this, config);

          if (typeof config !== 'string') {
            return;
          }

          if (typeof data[config] === 'undefined') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config](relatedTarget);
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_CLICK_DATA_API$2, SELECTOR_DATA_TOGGLE$2, function (event) {
      const target = getElementFromSelector(this);

      if (['A', 'AREA'].includes(this.tagName)) {
        event.preventDefault();
      }

      EventHandler.one(target, EVENT_SHOW$4, showEvent => {
        if (showEvent.defaultPrevented) {
          // only register focus restorer if modal will actually get shown
          return;
        }

        EventHandler.one(target, EVENT_HIDDEN$4, () => {
          if (isVisible(this)) {
            this.focus();
          }
        });
      }); // avoid conflict when clicking modal toggler while another one is open

      const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR$1);

      if (alreadyOpen) {
        Modal.getInstance(alreadyOpen).hide();
      }

      const data = Modal.getOrCreateInstance(target);
      data.toggle(this);
    });
    enableDismissTrigger(Modal);
    /**
     * jQuery
     */

    defineJQueryPlugin(Modal);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): offcanvas.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$6 = 'offcanvas';
    const DATA_KEY$3 = 'bs.offcanvas';
    const EVENT_KEY$3 = `.${DATA_KEY$3}`;
    const DATA_API_KEY$1 = '.data-api';
    const EVENT_LOAD_DATA_API$2 = `load${EVENT_KEY$3}${DATA_API_KEY$1}`;
    const ESCAPE_KEY = 'Escape';
    const CLASS_NAME_SHOW$3 = 'show';
    const CLASS_NAME_SHOWING$1 = 'showing';
    const CLASS_NAME_HIDING = 'hiding';
    const CLASS_NAME_BACKDROP = 'offcanvas-backdrop';
    const OPEN_SELECTOR = '.offcanvas.show';
    const EVENT_SHOW$3 = `show${EVENT_KEY$3}`;
    const EVENT_SHOWN$3 = `shown${EVENT_KEY$3}`;
    const EVENT_HIDE$3 = `hide${EVENT_KEY$3}`;
    const EVENT_HIDE_PREVENTED = `hidePrevented${EVENT_KEY$3}`;
    const EVENT_HIDDEN$3 = `hidden${EVENT_KEY$3}`;
    const EVENT_RESIZE = `resize${EVENT_KEY$3}`;
    const EVENT_CLICK_DATA_API$1 = `click${EVENT_KEY$3}${DATA_API_KEY$1}`;
    const EVENT_KEYDOWN_DISMISS = `keydown.dismiss${EVENT_KEY$3}`;
    const SELECTOR_DATA_TOGGLE$1 = '[data-bs-toggle="offcanvas"]';
    const Default$5 = {
      backdrop: true,
      keyboard: true,
      scroll: false
    };
    const DefaultType$5 = {
      backdrop: '(boolean|string)',
      keyboard: 'boolean',
      scroll: 'boolean'
    };
    /**
     * Class definition
     */

    class Offcanvas extends BaseComponent {
      constructor(element, config) {
        super(element, config);
        this._isShown = false;
        this._backdrop = this._initializeBackDrop();
        this._focustrap = this._initializeFocusTrap();

        this._addEventListeners();
      } // Getters


      static get Default() {
        return Default$5;
      }

      static get DefaultType() {
        return DefaultType$5;
      }

      static get NAME() {
        return NAME$6;
      } // Public


      toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      }

      show(relatedTarget) {
        if (this._isShown) {
          return;
        }

        const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$3, {
          relatedTarget
        });

        if (showEvent.defaultPrevented) {
          return;
        }

        this._isShown = true;

        this._backdrop.show();

        if (!this._config.scroll) {
          new ScrollBarHelper().hide();
        }

        this._element.setAttribute('aria-modal', true);

        this._element.setAttribute('role', 'dialog');

        this._element.classList.add(CLASS_NAME_SHOWING$1);

        const completeCallBack = () => {
          if (!this._config.scroll || this._config.backdrop) {
            this._focustrap.activate();
          }

          this._element.classList.add(CLASS_NAME_SHOW$3);

          this._element.classList.remove(CLASS_NAME_SHOWING$1);

          EventHandler.trigger(this._element, EVENT_SHOWN$3, {
            relatedTarget
          });
        };

        this._queueCallback(completeCallBack, this._element, true);
      }

      hide() {
        if (!this._isShown) {
          return;
        }

        const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$3);

        if (hideEvent.defaultPrevented) {
          return;
        }

        this._focustrap.deactivate();

        this._element.blur();

        this._isShown = false;

        this._element.classList.add(CLASS_NAME_HIDING);

        this._backdrop.hide();

        const completeCallback = () => {
          this._element.classList.remove(CLASS_NAME_SHOW$3, CLASS_NAME_HIDING);

          this._element.removeAttribute('aria-modal');

          this._element.removeAttribute('role');

          if (!this._config.scroll) {
            new ScrollBarHelper().reset();
          }

          EventHandler.trigger(this._element, EVENT_HIDDEN$3);
        };

        this._queueCallback(completeCallback, this._element, true);
      }

      dispose() {
        this._backdrop.dispose();

        this._focustrap.deactivate();

        super.dispose();
      } // Private


      _initializeBackDrop() {
        const clickCallback = () => {
          if (this._config.backdrop === 'static') {
            EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
            return;
          }

          this.hide();
        }; // 'static' option will be translated to true, and booleans will keep their value


        const isVisible = Boolean(this._config.backdrop);
        return new Backdrop({
          className: CLASS_NAME_BACKDROP,
          isVisible,
          isAnimated: true,
          rootElement: this._element.parentNode,
          clickCallback: isVisible ? clickCallback : null
        });
      }

      _initializeFocusTrap() {
        return new FocusTrap({
          trapElement: this._element
        });
      }

      _addEventListeners() {
        EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, event => {
          if (event.key !== ESCAPE_KEY) {
            return;
          }

          if (!this._config.keyboard) {
            EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
            return;
          }

          this.hide();
        });
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Offcanvas.getOrCreateInstance(this, config);

          if (typeof config !== 'string') {
            return;
          }

          if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config](this);
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_CLICK_DATA_API$1, SELECTOR_DATA_TOGGLE$1, function (event) {
      const target = getElementFromSelector(this);

      if (['A', 'AREA'].includes(this.tagName)) {
        event.preventDefault();
      }

      if (isDisabled(this)) {
        return;
      }

      EventHandler.one(target, EVENT_HIDDEN$3, () => {
        // focus on trigger when it is closed
        if (isVisible(this)) {
          this.focus();
        }
      }); // avoid conflict when clicking a toggler of an offcanvas, while another is open

      const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR);

      if (alreadyOpen && alreadyOpen !== target) {
        Offcanvas.getInstance(alreadyOpen).hide();
      }

      const data = Offcanvas.getOrCreateInstance(target);
      data.toggle(this);
    });
    EventHandler.on(window, EVENT_LOAD_DATA_API$2, () => {
      for (const selector of SelectorEngine.find(OPEN_SELECTOR)) {
        Offcanvas.getOrCreateInstance(selector).show();
      }
    });
    EventHandler.on(window, EVENT_RESIZE, () => {
      for (const element of SelectorEngine.find('[aria-modal][class*=show][class*=offcanvas-]')) {
        if (getComputedStyle(element).position !== 'fixed') {
          Offcanvas.getOrCreateInstance(element).hide();
        }
      }
    });
    enableDismissTrigger(Offcanvas);
    /**
     * jQuery
     */

    defineJQueryPlugin(Offcanvas);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/sanitizer.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    const uriAttributes = new Set(['background', 'cite', 'href', 'itemtype', 'longdesc', 'poster', 'src', 'xlink:href']);
    const ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;
    /**
     * A pattern that recognizes a commonly useful subset of URLs that are safe.
     *
     * Shout-out to Angular https://github.com/angular/angular/blob/12.2.x/packages/core/src/sanitization/url_sanitizer.ts
     */

    const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/i;
    /**
     * A pattern that matches safe data URLs. Only matches image, video and audio types.
     *
     * Shout-out to Angular https://github.com/angular/angular/blob/12.2.x/packages/core/src/sanitization/url_sanitizer.ts
     */

    const DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i;

    const allowedAttribute = (attribute, allowedAttributeList) => {
      const attributeName = attribute.nodeName.toLowerCase();

      if (allowedAttributeList.includes(attributeName)) {
        if (uriAttributes.has(attributeName)) {
          return Boolean(SAFE_URL_PATTERN.test(attribute.nodeValue) || DATA_URL_PATTERN.test(attribute.nodeValue));
        }

        return true;
      } // Check if a regular expression validates the attribute.


      return allowedAttributeList.filter(attributeRegex => attributeRegex instanceof RegExp).some(regex => regex.test(attributeName));
    };

    const DefaultAllowlist = {
      // Global attributes allowed on any supplied element below.
      '*': ['class', 'dir', 'id', 'lang', 'role', ARIA_ATTRIBUTE_PATTERN],
      a: ['target', 'href', 'title', 'rel'],
      area: [],
      b: [],
      br: [],
      col: [],
      code: [],
      div: [],
      em: [],
      hr: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      i: [],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height'],
      li: [],
      ol: [],
      p: [],
      pre: [],
      s: [],
      small: [],
      span: [],
      sub: [],
      sup: [],
      strong: [],
      u: [],
      ul: []
    };
    function sanitizeHtml(unsafeHtml, allowList, sanitizeFunction) {
      if (!unsafeHtml.length) {
        return unsafeHtml;
      }

      if (sanitizeFunction && typeof sanitizeFunction === 'function') {
        return sanitizeFunction(unsafeHtml);
      }

      const domParser = new window.DOMParser();
      const createdDocument = domParser.parseFromString(unsafeHtml, 'text/html');
      const elements = [].concat(...createdDocument.body.querySelectorAll('*'));

      for (const element of elements) {
        const elementName = element.nodeName.toLowerCase();

        if (!Object.keys(allowList).includes(elementName)) {
          element.remove();
          continue;
        }

        const attributeList = [].concat(...element.attributes);
        const allowedAttributes = [].concat(allowList['*'] || [], allowList[elementName] || []);

        for (const attribute of attributeList) {
          if (!allowedAttribute(attribute, allowedAttributes)) {
            element.removeAttribute(attribute.nodeName);
          }
        }
      }

      return createdDocument.body.innerHTML;
    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): util/template-factory.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$5 = 'TemplateFactory';
    const Default$4 = {
      allowList: DefaultAllowlist,
      content: {},
      // { selector : text ,  selector2 : text2 , }
      extraClass: '',
      html: false,
      sanitize: true,
      sanitizeFn: null,
      template: '<div></div>'
    };
    const DefaultType$4 = {
      allowList: 'object',
      content: 'object',
      extraClass: '(string|function)',
      html: 'boolean',
      sanitize: 'boolean',
      sanitizeFn: '(null|function)',
      template: 'string'
    };
    const DefaultContentType = {
      entry: '(string|element|function|null)',
      selector: '(string|element)'
    };
    /**
     * Class definition
     */

    class TemplateFactory extends Config {
      constructor(config) {
        super();
        this._config = this._getConfig(config);
      } // Getters


      static get Default() {
        return Default$4;
      }

      static get DefaultType() {
        return DefaultType$4;
      }

      static get NAME() {
        return NAME$5;
      } // Public


      getContent() {
        return Object.values(this._config.content).map(config => this._resolvePossibleFunction(config)).filter(Boolean);
      }

      hasContent() {
        return this.getContent().length > 0;
      }

      changeContent(content) {
        this._checkContent(content);

        this._config.content = { ...this._config.content,
          ...content
        };
        return this;
      }

      toHtml() {
        const templateWrapper = document.createElement('div');
        templateWrapper.innerHTML = this._maybeSanitize(this._config.template);

        for (const [selector, text] of Object.entries(this._config.content)) {
          this._setContent(templateWrapper, text, selector);
        }

        const template = templateWrapper.children[0];

        const extraClass = this._resolvePossibleFunction(this._config.extraClass);

        if (extraClass) {
          template.classList.add(...extraClass.split(' '));
        }

        return template;
      } // Private


      _typeCheckConfig(config) {
        super._typeCheckConfig(config);

        this._checkContent(config.content);
      }

      _checkContent(arg) {
        for (const [selector, content] of Object.entries(arg)) {
          super._typeCheckConfig({
            selector,
            entry: content
          }, DefaultContentType);
        }
      }

      _setContent(template, content, selector) {
        const templateElement = SelectorEngine.findOne(selector, template);

        if (!templateElement) {
          return;
        }

        content = this._resolvePossibleFunction(content);

        if (!content) {
          templateElement.remove();
          return;
        }

        if (isElement(content)) {
          this._putElementInTemplate(getElement(content), templateElement);

          return;
        }

        if (this._config.html) {
          templateElement.innerHTML = this._maybeSanitize(content);
          return;
        }

        templateElement.textContent = content;
      }

      _maybeSanitize(arg) {
        return this._config.sanitize ? sanitizeHtml(arg, this._config.allowList, this._config.sanitizeFn) : arg;
      }

      _resolvePossibleFunction(arg) {
        return typeof arg === 'function' ? arg(this) : arg;
      }

      _putElementInTemplate(element, templateElement) {
        if (this._config.html) {
          templateElement.innerHTML = '';
          templateElement.append(element);
          return;
        }

        templateElement.textContent = element.textContent;
      }

    }

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): tooltip.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$4 = 'tooltip';
    const DISALLOWED_ATTRIBUTES = new Set(['sanitize', 'allowList', 'sanitizeFn']);
    const CLASS_NAME_FADE$2 = 'fade';
    const CLASS_NAME_MODAL = 'modal';
    const CLASS_NAME_SHOW$2 = 'show';
    const SELECTOR_TOOLTIP_INNER = '.tooltip-inner';
    const SELECTOR_MODAL = `.${CLASS_NAME_MODAL}`;
    const EVENT_MODAL_HIDE = 'hide.bs.modal';
    const TRIGGER_HOVER = 'hover';
    const TRIGGER_FOCUS = 'focus';
    const TRIGGER_CLICK = 'click';
    const TRIGGER_MANUAL = 'manual';
    const EVENT_HIDE$2 = 'hide';
    const EVENT_HIDDEN$2 = 'hidden';
    const EVENT_SHOW$2 = 'show';
    const EVENT_SHOWN$2 = 'shown';
    const EVENT_INSERTED = 'inserted';
    const EVENT_CLICK$1 = 'click';
    const EVENT_FOCUSIN$1 = 'focusin';
    const EVENT_FOCUSOUT$1 = 'focusout';
    const EVENT_MOUSEENTER = 'mouseenter';
    const EVENT_MOUSELEAVE = 'mouseleave';
    const AttachmentMap = {
      AUTO: 'auto',
      TOP: 'top',
      RIGHT: isRTL() ? 'left' : 'right',
      BOTTOM: 'bottom',
      LEFT: isRTL() ? 'right' : 'left'
    };
    const Default$3 = {
      allowList: DefaultAllowlist,
      animation: true,
      boundary: 'clippingParents',
      container: false,
      customClass: '',
      delay: 0,
      fallbackPlacements: ['top', 'right', 'bottom', 'left'],
      html: false,
      offset: [0, 0],
      placement: 'top',
      popperConfig: null,
      sanitize: true,
      sanitizeFn: null,
      selector: false,
      template: '<div class="tooltip" role="tooltip">' + '<div class="tooltip-arrow"></div>' + '<div class="tooltip-inner"></div>' + '</div>',
      title: '',
      trigger: 'hover focus'
    };
    const DefaultType$3 = {
      allowList: 'object',
      animation: 'boolean',
      boundary: '(string|element)',
      container: '(string|element|boolean)',
      customClass: '(string|function)',
      delay: '(number|object)',
      fallbackPlacements: 'array',
      html: 'boolean',
      offset: '(array|string|function)',
      placement: '(string|function)',
      popperConfig: '(null|object|function)',
      sanitize: 'boolean',
      sanitizeFn: '(null|function)',
      selector: '(string|boolean)',
      template: 'string',
      title: '(string|element|function)',
      trigger: 'string'
    };
    /**
     * Class definition
     */

    class Tooltip extends BaseComponent {
      constructor(element, config) {
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap\'s tooltips require Popper (https://popper.js.org)');
        }

        super(element, config); // Private

        this._isEnabled = true;
        this._timeout = 0;
        this._isHovered = null;
        this._activeTrigger = {};
        this._popper = null;
        this._templateFactory = null;
        this._newContent = null; // Protected

        this.tip = null;

        this._setListeners();

        if (!this._config.selector) {
          this._fixTitle();
        }
      } // Getters


      static get Default() {
        return Default$3;
      }

      static get DefaultType() {
        return DefaultType$3;
      }

      static get NAME() {
        return NAME$4;
      } // Public


      enable() {
        this._isEnabled = true;
      }

      disable() {
        this._isEnabled = false;
      }

      toggleEnabled() {
        this._isEnabled = !this._isEnabled;
      }

      toggle() {
        if (!this._isEnabled) {
          return;
        }

        this._activeTrigger.click = !this._activeTrigger.click;

        if (this._isShown()) {
          this._leave();

          return;
        }

        this._enter();
      }

      dispose() {
        clearTimeout(this._timeout);
        EventHandler.off(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);

        if (this._element.getAttribute('data-bs-original-title')) {
          this._element.setAttribute('title', this._element.getAttribute('data-bs-original-title'));
        }

        this._disposePopper();

        super.dispose();
      }

      show() {
        if (this._element.style.display === 'none') {
          throw new Error('Please use show on visible elements');
        }

        if (!(this._isWithContent() && this._isEnabled)) {
          return;
        }

        const showEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOW$2));
        const shadowRoot = findShadowRoot(this._element);

        const isInTheDom = (shadowRoot || this._element.ownerDocument.documentElement).contains(this._element);

        if (showEvent.defaultPrevented || !isInTheDom) {
          return;
        } // todo v6 remove this OR make it optional


        this._disposePopper();

        const tip = this._getTipElement();

        this._element.setAttribute('aria-describedby', tip.getAttribute('id'));

        const {
          container
        } = this._config;

        if (!this._element.ownerDocument.documentElement.contains(this.tip)) {
          container.append(tip);
          EventHandler.trigger(this._element, this.constructor.eventName(EVENT_INSERTED));
        }

        this._popper = this._createPopper(tip);
        tip.classList.add(CLASS_NAME_SHOW$2); // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html

        if ('ontouchstart' in document.documentElement) {
          for (const element of [].concat(...document.body.children)) {
            EventHandler.on(element, 'mouseover', noop);
          }
        }

        const complete = () => {
          EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOWN$2));

          if (this._isHovered === false) {
            this._leave();
          }

          this._isHovered = false;
        };

        this._queueCallback(complete, this.tip, this._isAnimated());
      }

      hide() {
        if (!this._isShown()) {
          return;
        }

        const hideEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDE$2));

        if (hideEvent.defaultPrevented) {
          return;
        }

        const tip = this._getTipElement();

        tip.classList.remove(CLASS_NAME_SHOW$2); // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support

        if ('ontouchstart' in document.documentElement) {
          for (const element of [].concat(...document.body.children)) {
            EventHandler.off(element, 'mouseover', noop);
          }
        }

        this._activeTrigger[TRIGGER_CLICK] = false;
        this._activeTrigger[TRIGGER_FOCUS] = false;
        this._activeTrigger[TRIGGER_HOVER] = false;
        this._isHovered = null; // it is a trick to support manual triggering

        const complete = () => {
          if (this._isWithActiveTrigger()) {
            return;
          }

          if (!this._isHovered) {
            this._disposePopper();
          }

          this._element.removeAttribute('aria-describedby');

          EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDDEN$2));
        };

        this._queueCallback(complete, this.tip, this._isAnimated());
      }

      update() {
        if (this._popper) {
          this._popper.update();
        }
      } // Protected


      _isWithContent() {
        return Boolean(this._getTitle());
      }

      _getTipElement() {
        if (!this.tip) {
          this.tip = this._createTipElement(this._newContent || this._getContentForTemplate());
        }

        return this.tip;
      }

      _createTipElement(content) {
        const tip = this._getTemplateFactory(content).toHtml(); // todo: remove this check on v6


        if (!tip) {
          return null;
        }

        tip.classList.remove(CLASS_NAME_FADE$2, CLASS_NAME_SHOW$2); // todo: on v6 the following can be achieved with CSS only

        tip.classList.add(`bs-${this.constructor.NAME}-auto`);
        const tipId = getUID(this.constructor.NAME).toString();
        tip.setAttribute('id', tipId);

        if (this._isAnimated()) {
          tip.classList.add(CLASS_NAME_FADE$2);
        }

        return tip;
      }

      setContent(content) {
        this._newContent = content;

        if (this._isShown()) {
          this._disposePopper();

          this.show();
        }
      }

      _getTemplateFactory(content) {
        if (this._templateFactory) {
          this._templateFactory.changeContent(content);
        } else {
          this._templateFactory = new TemplateFactory({ ...this._config,
            // the `content` var has to be after `this._config`
            // to override config.content in case of popover
            content,
            extraClass: this._resolvePossibleFunction(this._config.customClass)
          });
        }

        return this._templateFactory;
      }

      _getContentForTemplate() {
        return {
          [SELECTOR_TOOLTIP_INNER]: this._getTitle()
        };
      }

      _getTitle() {
        return this._resolvePossibleFunction(this._config.title) || this._element.getAttribute('data-bs-original-title');
      } // Private


      _initializeOnDelegatedTarget(event) {
        return this.constructor.getOrCreateInstance(event.delegateTarget, this._getDelegateConfig());
      }

      _isAnimated() {
        return this._config.animation || this.tip && this.tip.classList.contains(CLASS_NAME_FADE$2);
      }

      _isShown() {
        return this.tip && this.tip.classList.contains(CLASS_NAME_SHOW$2);
      }

      _createPopper(tip) {
        const placement = typeof this._config.placement === 'function' ? this._config.placement.call(this, tip, this._element) : this._config.placement;
        const attachment = AttachmentMap[placement.toUpperCase()];
        return createPopper(this._element, tip, this._getPopperConfig(attachment));
      }

      _getOffset() {
        const {
          offset
        } = this._config;

        if (typeof offset === 'string') {
          return offset.split(',').map(value => Number.parseInt(value, 10));
        }

        if (typeof offset === 'function') {
          return popperData => offset(popperData, this._element);
        }

        return offset;
      }

      _resolvePossibleFunction(arg) {
        return typeof arg === 'function' ? arg.call(this._element) : arg;
      }

      _getPopperConfig(attachment) {
        const defaultBsPopperConfig = {
          placement: attachment,
          modifiers: [{
            name: 'flip',
            options: {
              fallbackPlacements: this._config.fallbackPlacements
            }
          }, {
            name: 'offset',
            options: {
              offset: this._getOffset()
            }
          }, {
            name: 'preventOverflow',
            options: {
              boundary: this._config.boundary
            }
          }, {
            name: 'arrow',
            options: {
              element: `.${this.constructor.NAME}-arrow`
            }
          }, {
            name: 'preSetPlacement',
            enabled: true,
            phase: 'beforeMain',
            fn: data => {
              // Pre-set Popper's placement attribute in order to read the arrow sizes properly.
              // Otherwise, Popper mixes up the width and height dimensions since the initial arrow style is for top placement
              this._getTipElement().setAttribute('data-popper-placement', data.state.placement);
            }
          }]
        };
        return { ...defaultBsPopperConfig,
          ...(typeof this._config.popperConfig === 'function' ? this._config.popperConfig(defaultBsPopperConfig) : this._config.popperConfig)
        };
      }

      _setListeners() {
        const triggers = this._config.trigger.split(' ');

        for (const trigger of triggers) {
          if (trigger === 'click') {
            EventHandler.on(this._element, this.constructor.eventName(EVENT_CLICK$1), this._config.selector, event => {
              const context = this._initializeOnDelegatedTarget(event);

              context.toggle();
            });
          } else if (trigger !== TRIGGER_MANUAL) {
            const eventIn = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSEENTER) : this.constructor.eventName(EVENT_FOCUSIN$1);
            const eventOut = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSELEAVE) : this.constructor.eventName(EVENT_FOCUSOUT$1);
            EventHandler.on(this._element, eventIn, this._config.selector, event => {
              const context = this._initializeOnDelegatedTarget(event);

              context._activeTrigger[event.type === 'focusin' ? TRIGGER_FOCUS : TRIGGER_HOVER] = true;

              context._enter();
            });
            EventHandler.on(this._element, eventOut, this._config.selector, event => {
              const context = this._initializeOnDelegatedTarget(event);

              context._activeTrigger[event.type === 'focusout' ? TRIGGER_FOCUS : TRIGGER_HOVER] = context._element.contains(event.relatedTarget);

              context._leave();
            });
          }
        }

        this._hideModalHandler = () => {
          if (this._element) {
            this.hide();
          }
        };

        EventHandler.on(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
      }

      _fixTitle() {
        const title = this._element.getAttribute('title');

        if (!title) {
          return;
        }

        if (!this._element.getAttribute('aria-label') && !this._element.textContent.trim()) {
          this._element.setAttribute('aria-label', title);
        }

        this._element.setAttribute('data-bs-original-title', title); // DO NOT USE IT. Is only for backwards compatibility


        this._element.removeAttribute('title');
      }

      _enter() {
        if (this._isShown() || this._isHovered) {
          this._isHovered = true;
          return;
        }

        this._isHovered = true;

        this._setTimeout(() => {
          if (this._isHovered) {
            this.show();
          }
        }, this._config.delay.show);
      }

      _leave() {
        if (this._isWithActiveTrigger()) {
          return;
        }

        this._isHovered = false;

        this._setTimeout(() => {
          if (!this._isHovered) {
            this.hide();
          }
        }, this._config.delay.hide);
      }

      _setTimeout(handler, timeout) {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(handler, timeout);
      }

      _isWithActiveTrigger() {
        return Object.values(this._activeTrigger).includes(true);
      }

      _getConfig(config) {
        const dataAttributes = Manipulator.getDataAttributes(this._element);

        for (const dataAttribute of Object.keys(dataAttributes)) {
          if (DISALLOWED_ATTRIBUTES.has(dataAttribute)) {
            delete dataAttributes[dataAttribute];
          }
        }

        config = { ...dataAttributes,
          ...(typeof config === 'object' && config ? config : {})
        };
        config = this._mergeConfigObj(config);
        config = this._configAfterMerge(config);

        this._typeCheckConfig(config);

        return config;
      }

      _configAfterMerge(config) {
        config.container = config.container === false ? document.body : getElement(config.container);

        if (typeof config.delay === 'number') {
          config.delay = {
            show: config.delay,
            hide: config.delay
          };
        }

        if (typeof config.title === 'number') {
          config.title = config.title.toString();
        }

        if (typeof config.content === 'number') {
          config.content = config.content.toString();
        }

        return config;
      }

      _getDelegateConfig() {
        const config = {};

        for (const key in this._config) {
          if (this.constructor.Default[key] !== this._config[key]) {
            config[key] = this._config[key];
          }
        }

        config.selector = false;
        config.trigger = 'manual'; // In the future can be replaced with:
        // const keysWithDifferentValues = Object.entries(this._config).filter(entry => this.constructor.Default[entry[0]] !== this._config[entry[0]])
        // `Object.fromEntries(keysWithDifferentValues)`

        return config;
      }

      _disposePopper() {
        if (this._popper) {
          this._popper.destroy();

          this._popper = null;
        }

        if (this.tip) {
          this.tip.remove();
          this.tip = null;
        }
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Tooltip.getOrCreateInstance(this, config);

          if (typeof config !== 'string') {
            return;
          }

          if (typeof data[config] === 'undefined') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config]();
        });
      }

    }
    /**
     * jQuery
     */


    defineJQueryPlugin(Tooltip);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): popover.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$3 = 'popover';
    const SELECTOR_TITLE = '.popover-header';
    const SELECTOR_CONTENT = '.popover-body';
    const Default$2 = { ...Tooltip.Default,
      content: '',
      offset: [0, 8],
      placement: 'right',
      template: '<div class="popover" role="tooltip">' + '<div class="popover-arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div>' + '</div>',
      trigger: 'click'
    };
    const DefaultType$2 = { ...Tooltip.DefaultType,
      content: '(null|string|element|function)'
    };
    /**
     * Class definition
     */

    class Popover extends Tooltip {
      // Getters
      static get Default() {
        return Default$2;
      }

      static get DefaultType() {
        return DefaultType$2;
      }

      static get NAME() {
        return NAME$3;
      } // Overrides


      _isWithContent() {
        return this._getTitle() || this._getContent();
      } // Private


      _getContentForTemplate() {
        return {
          [SELECTOR_TITLE]: this._getTitle(),
          [SELECTOR_CONTENT]: this._getContent()
        };
      }

      _getContent() {
        return this._resolvePossibleFunction(this._config.content);
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Popover.getOrCreateInstance(this, config);

          if (typeof config !== 'string') {
            return;
          }

          if (typeof data[config] === 'undefined') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config]();
        });
      }

    }
    /**
     * jQuery
     */


    defineJQueryPlugin(Popover);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): scrollspy.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$2 = 'scrollspy';
    const DATA_KEY$2 = 'bs.scrollspy';
    const EVENT_KEY$2 = `.${DATA_KEY$2}`;
    const DATA_API_KEY = '.data-api';
    const EVENT_ACTIVATE = `activate${EVENT_KEY$2}`;
    const EVENT_CLICK = `click${EVENT_KEY$2}`;
    const EVENT_LOAD_DATA_API$1 = `load${EVENT_KEY$2}${DATA_API_KEY}`;
    const CLASS_NAME_DROPDOWN_ITEM = 'dropdown-item';
    const CLASS_NAME_ACTIVE$1 = 'active';
    const SELECTOR_DATA_SPY = '[data-bs-spy="scroll"]';
    const SELECTOR_TARGET_LINKS = '[href]';
    const SELECTOR_NAV_LIST_GROUP = '.nav, .list-group';
    const SELECTOR_NAV_LINKS = '.nav-link';
    const SELECTOR_NAV_ITEMS = '.nav-item';
    const SELECTOR_LIST_ITEMS = '.list-group-item';
    const SELECTOR_LINK_ITEMS = `${SELECTOR_NAV_LINKS}, ${SELECTOR_NAV_ITEMS} > ${SELECTOR_NAV_LINKS}, ${SELECTOR_LIST_ITEMS}`;
    const SELECTOR_DROPDOWN = '.dropdown';
    const SELECTOR_DROPDOWN_TOGGLE$1 = '.dropdown-toggle';
    const Default$1 = {
      offset: null,
      // TODO: v6 @deprecated, keep it for backwards compatibility reasons
      rootMargin: '0px 0px -25%',
      smoothScroll: false,
      target: null,
      threshold: [0.1, 0.5, 1]
    };
    const DefaultType$1 = {
      offset: '(number|null)',
      // TODO v6 @deprecated, keep it for backwards compatibility reasons
      rootMargin: 'string',
      smoothScroll: 'boolean',
      target: 'element',
      threshold: 'array'
    };
    /**
     * Class definition
     */

    class ScrollSpy extends BaseComponent {
      constructor(element, config) {
        super(element, config); // this._element is the observablesContainer and config.target the menu links wrapper

        this._targetLinks = new Map();
        this._observableSections = new Map();
        this._rootElement = getComputedStyle(this._element).overflowY === 'visible' ? null : this._element;
        this._activeTarget = null;
        this._observer = null;
        this._previousScrollData = {
          visibleEntryTop: 0,
          parentScrollTop: 0
        };
        this.refresh(); // initialize
      } // Getters


      static get Default() {
        return Default$1;
      }

      static get DefaultType() {
        return DefaultType$1;
      }

      static get NAME() {
        return NAME$2;
      } // Public


      refresh() {
        this._initializeTargetsAndObservables();

        this._maybeEnableSmoothScroll();

        if (this._observer) {
          this._observer.disconnect();
        } else {
          this._observer = this._getNewObserver();
        }

        for (const section of this._observableSections.values()) {
          this._observer.observe(section);
        }
      }

      dispose() {
        this._observer.disconnect();

        super.dispose();
      } // Private


      _configAfterMerge(config) {
        // TODO: on v6 target should be given explicitly & remove the {target: 'ss-target'} case
        config.target = getElement(config.target) || document.body; // TODO: v6 Only for backwards compatibility reasons. Use rootMargin only

        config.rootMargin = config.offset ? `${config.offset}px 0px -30%` : config.rootMargin;

        if (typeof config.threshold === 'string') {
          config.threshold = config.threshold.split(',').map(value => Number.parseFloat(value));
        }

        return config;
      }

      _maybeEnableSmoothScroll() {
        if (!this._config.smoothScroll) {
          return;
        } // unregister any previous listeners


        EventHandler.off(this._config.target, EVENT_CLICK);
        EventHandler.on(this._config.target, EVENT_CLICK, SELECTOR_TARGET_LINKS, event => {
          const observableSection = this._observableSections.get(event.target.hash);

          if (observableSection) {
            event.preventDefault();
            const root = this._rootElement || window;
            const height = observableSection.offsetTop - this._element.offsetTop;

            if (root.scrollTo) {
              root.scrollTo({
                top: height,
                behavior: 'smooth'
              });
              return;
            } // Chrome 60 doesn't support `scrollTo`


            root.scrollTop = height;
          }
        });
      }

      _getNewObserver() {
        const options = {
          root: this._rootElement,
          threshold: this._config.threshold,
          rootMargin: this._config.rootMargin
        };
        return new IntersectionObserver(entries => this._observerCallback(entries), options);
      } // The logic of selection


      _observerCallback(entries) {
        const targetElement = entry => this._targetLinks.get(`#${entry.target.id}`);

        const activate = entry => {
          this._previousScrollData.visibleEntryTop = entry.target.offsetTop;

          this._process(targetElement(entry));
        };

        const parentScrollTop = (this._rootElement || document.documentElement).scrollTop;
        const userScrollsDown = parentScrollTop >= this._previousScrollData.parentScrollTop;
        this._previousScrollData.parentScrollTop = parentScrollTop;

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            this._activeTarget = null;

            this._clearActiveClass(targetElement(entry));

            continue;
          }

          const entryIsLowerThanPrevious = entry.target.offsetTop >= this._previousScrollData.visibleEntryTop; // if we are scrolling down, pick the bigger offsetTop

          if (userScrollsDown && entryIsLowerThanPrevious) {
            activate(entry); // if parent isn't scrolled, let's keep the first visible item, breaking the iteration

            if (!parentScrollTop) {
              return;
            }

            continue;
          } // if we are scrolling up, pick the smallest offsetTop


          if (!userScrollsDown && !entryIsLowerThanPrevious) {
            activate(entry);
          }
        }
      }

      _initializeTargetsAndObservables() {
        this._targetLinks = new Map();
        this._observableSections = new Map();
        const targetLinks = SelectorEngine.find(SELECTOR_TARGET_LINKS, this._config.target);

        for (const anchor of targetLinks) {
          // ensure that the anchor has an id and is not disabled
          if (!anchor.hash || isDisabled(anchor)) {
            continue;
          }

          const observableSection = SelectorEngine.findOne(anchor.hash, this._element); // ensure that the observableSection exists & is visible

          if (isVisible(observableSection)) {
            this._targetLinks.set(anchor.hash, anchor);

            this._observableSections.set(anchor.hash, observableSection);
          }
        }
      }

      _process(target) {
        if (this._activeTarget === target) {
          return;
        }

        this._clearActiveClass(this._config.target);

        this._activeTarget = target;
        target.classList.add(CLASS_NAME_ACTIVE$1);

        this._activateParents(target);

        EventHandler.trigger(this._element, EVENT_ACTIVATE, {
          relatedTarget: target
        });
      }

      _activateParents(target) {
        // Activate dropdown parents
        if (target.classList.contains(CLASS_NAME_DROPDOWN_ITEM)) {
          SelectorEngine.findOne(SELECTOR_DROPDOWN_TOGGLE$1, target.closest(SELECTOR_DROPDOWN)).classList.add(CLASS_NAME_ACTIVE$1);
          return;
        }

        for (const listGroup of SelectorEngine.parents(target, SELECTOR_NAV_LIST_GROUP)) {
          // Set triggered links parents as active
          // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor
          for (const item of SelectorEngine.prev(listGroup, SELECTOR_LINK_ITEMS)) {
            item.classList.add(CLASS_NAME_ACTIVE$1);
          }
        }
      }

      _clearActiveClass(parent) {
        parent.classList.remove(CLASS_NAME_ACTIVE$1);
        const activeNodes = SelectorEngine.find(`${SELECTOR_TARGET_LINKS}.${CLASS_NAME_ACTIVE$1}`, parent);

        for (const node of activeNodes) {
          node.classList.remove(CLASS_NAME_ACTIVE$1);
        }
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = ScrollSpy.getOrCreateInstance(this, config);

          if (typeof config !== 'string') {
            return;
          }

          if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config]();
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(window, EVENT_LOAD_DATA_API$1, () => {
      for (const spy of SelectorEngine.find(SELECTOR_DATA_SPY)) {
        ScrollSpy.getOrCreateInstance(spy);
      }
    });
    /**
     * jQuery
     */

    defineJQueryPlugin(ScrollSpy);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): tab.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME$1 = 'tab';
    const DATA_KEY$1 = 'bs.tab';
    const EVENT_KEY$1 = `.${DATA_KEY$1}`;
    const EVENT_HIDE$1 = `hide${EVENT_KEY$1}`;
    const EVENT_HIDDEN$1 = `hidden${EVENT_KEY$1}`;
    const EVENT_SHOW$1 = `show${EVENT_KEY$1}`;
    const EVENT_SHOWN$1 = `shown${EVENT_KEY$1}`;
    const EVENT_CLICK_DATA_API = `click${EVENT_KEY$1}`;
    const EVENT_KEYDOWN = `keydown${EVENT_KEY$1}`;
    const EVENT_LOAD_DATA_API = `load${EVENT_KEY$1}`;
    const ARROW_LEFT_KEY = 'ArrowLeft';
    const ARROW_RIGHT_KEY = 'ArrowRight';
    const ARROW_UP_KEY = 'ArrowUp';
    const ARROW_DOWN_KEY = 'ArrowDown';
    const CLASS_NAME_ACTIVE = 'active';
    const CLASS_NAME_FADE$1 = 'fade';
    const CLASS_NAME_SHOW$1 = 'show';
    const CLASS_DROPDOWN = 'dropdown';
    const SELECTOR_DROPDOWN_TOGGLE = '.dropdown-toggle';
    const SELECTOR_DROPDOWN_MENU = '.dropdown-menu';
    const NOT_SELECTOR_DROPDOWN_TOGGLE = ':not(.dropdown-toggle)';
    const SELECTOR_TAB_PANEL = '.list-group, .nav, [role="tablist"]';
    const SELECTOR_OUTER = '.nav-item, .list-group-item';
    const SELECTOR_INNER = `.nav-link${NOT_SELECTOR_DROPDOWN_TOGGLE}, .list-group-item${NOT_SELECTOR_DROPDOWN_TOGGLE}, [role="tab"]${NOT_SELECTOR_DROPDOWN_TOGGLE}`;
    const SELECTOR_DATA_TOGGLE = '[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]'; // todo:v6: could be only `tab`

    const SELECTOR_INNER_ELEM = `${SELECTOR_INNER}, ${SELECTOR_DATA_TOGGLE}`;
    const SELECTOR_DATA_TOGGLE_ACTIVE = `.${CLASS_NAME_ACTIVE}[data-bs-toggle="tab"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="pill"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="list"]`;
    /**
     * Class definition
     */

    class Tab extends BaseComponent {
      constructor(element) {
        super(element);
        this._parent = this._element.closest(SELECTOR_TAB_PANEL);

        if (!this._parent) {
          return; // todo: should Throw exception on v6
          // throw new TypeError(`${element.outerHTML} has not a valid parent ${SELECTOR_INNER_ELEM}`)
        } // Set up initial aria attributes


        this._setInitialAttributes(this._parent, this._getChildren());

        EventHandler.on(this._element, EVENT_KEYDOWN, event => this._keydown(event));
      } // Getters


      static get NAME() {
        return NAME$1;
      } // Public


      show() {
        // Shows this elem and deactivate the active sibling if exists
        const innerElem = this._element;

        if (this._elemIsActive(innerElem)) {
          return;
        } // Search for active tab on same parent to deactivate it


        const active = this._getActiveElem();

        const hideEvent = active ? EventHandler.trigger(active, EVENT_HIDE$1, {
          relatedTarget: innerElem
        }) : null;
        const showEvent = EventHandler.trigger(innerElem, EVENT_SHOW$1, {
          relatedTarget: active
        });

        if (showEvent.defaultPrevented || hideEvent && hideEvent.defaultPrevented) {
          return;
        }

        this._deactivate(active, innerElem);

        this._activate(innerElem, active);
      } // Private


      _activate(element, relatedElem) {
        if (!element) {
          return;
        }

        element.classList.add(CLASS_NAME_ACTIVE);

        this._activate(getElementFromSelector(element)); // Search and activate/show the proper section


        const complete = () => {
          if (element.getAttribute('role') !== 'tab') {
            element.classList.add(CLASS_NAME_SHOW$1);
            return;
          }

          element.removeAttribute('tabindex');
          element.setAttribute('aria-selected', true);

          this._toggleDropDown(element, true);

          EventHandler.trigger(element, EVENT_SHOWN$1, {
            relatedTarget: relatedElem
          });
        };

        this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1));
      }

      _deactivate(element, relatedElem) {
        if (!element) {
          return;
        }

        element.classList.remove(CLASS_NAME_ACTIVE);
        element.blur();

        this._deactivate(getElementFromSelector(element)); // Search and deactivate the shown section too


        const complete = () => {
          if (element.getAttribute('role') !== 'tab') {
            element.classList.remove(CLASS_NAME_SHOW$1);
            return;
          }

          element.setAttribute('aria-selected', false);
          element.setAttribute('tabindex', '-1');

          this._toggleDropDown(element, false);

          EventHandler.trigger(element, EVENT_HIDDEN$1, {
            relatedTarget: relatedElem
          });
        };

        this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1));
      }

      _keydown(event) {
        if (![ARROW_LEFT_KEY, ARROW_RIGHT_KEY, ARROW_UP_KEY, ARROW_DOWN_KEY].includes(event.key)) {
          return;
        }

        event.stopPropagation(); // stopPropagation/preventDefault both added to support up/down keys without scrolling the page

        event.preventDefault();
        const isNext = [ARROW_RIGHT_KEY, ARROW_DOWN_KEY].includes(event.key);
        const nextActiveElement = getNextActiveElement(this._getChildren().filter(element => !isDisabled(element)), event.target, isNext, true);

        if (nextActiveElement) {
          nextActiveElement.focus({
            preventScroll: true
          });
          Tab.getOrCreateInstance(nextActiveElement).show();
        }
      }

      _getChildren() {
        // collection of inner elements
        return SelectorEngine.find(SELECTOR_INNER_ELEM, this._parent);
      }

      _getActiveElem() {
        return this._getChildren().find(child => this._elemIsActive(child)) || null;
      }

      _setInitialAttributes(parent, children) {
        this._setAttributeIfNotExists(parent, 'role', 'tablist');

        for (const child of children) {
          this._setInitialAttributesOnChild(child);
        }
      }

      _setInitialAttributesOnChild(child) {
        child = this._getInnerElement(child);

        const isActive = this._elemIsActive(child);

        const outerElem = this._getOuterElement(child);

        child.setAttribute('aria-selected', isActive);

        if (outerElem !== child) {
          this._setAttributeIfNotExists(outerElem, 'role', 'presentation');
        }

        if (!isActive) {
          child.setAttribute('tabindex', '-1');
        }

        this._setAttributeIfNotExists(child, 'role', 'tab'); // set attributes to the related panel too


        this._setInitialAttributesOnTargetPanel(child);
      }

      _setInitialAttributesOnTargetPanel(child) {
        const target = getElementFromSelector(child);

        if (!target) {
          return;
        }

        this._setAttributeIfNotExists(target, 'role', 'tabpanel');

        if (child.id) {
          this._setAttributeIfNotExists(target, 'aria-labelledby', `#${child.id}`);
        }
      }

      _toggleDropDown(element, open) {
        const outerElem = this._getOuterElement(element);

        if (!outerElem.classList.contains(CLASS_DROPDOWN)) {
          return;
        }

        const toggle = (selector, className) => {
          const element = SelectorEngine.findOne(selector, outerElem);

          if (element) {
            element.classList.toggle(className, open);
          }
        };

        toggle(SELECTOR_DROPDOWN_TOGGLE, CLASS_NAME_ACTIVE);
        toggle(SELECTOR_DROPDOWN_MENU, CLASS_NAME_SHOW$1);
        outerElem.setAttribute('aria-expanded', open);
      }

      _setAttributeIfNotExists(element, attribute, value) {
        if (!element.hasAttribute(attribute)) {
          element.setAttribute(attribute, value);
        }
      }

      _elemIsActive(elem) {
        return elem.classList.contains(CLASS_NAME_ACTIVE);
      } // Try to get the inner element (usually the .nav-link)


      _getInnerElement(elem) {
        return elem.matches(SELECTOR_INNER_ELEM) ? elem : SelectorEngine.findOne(SELECTOR_INNER_ELEM, elem);
      } // Try to get the outer element (usually the .nav-item)


      _getOuterElement(elem) {
        return elem.closest(SELECTOR_OUTER) || elem;
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Tab.getOrCreateInstance(this);

          if (typeof config !== 'string') {
            return;
          }

          if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
            throw new TypeError(`No method named "${config}"`);
          }

          data[config]();
        });
      }

    }
    /**
     * Data API implementation
     */


    EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, function (event) {
      if (['A', 'AREA'].includes(this.tagName)) {
        event.preventDefault();
      }

      if (isDisabled(this)) {
        return;
      }

      Tab.getOrCreateInstance(this).show();
    });
    /**
     * Initialize on focus
     */

    EventHandler.on(window, EVENT_LOAD_DATA_API, () => {
      for (const element of SelectorEngine.find(SELECTOR_DATA_TOGGLE_ACTIVE)) {
        Tab.getOrCreateInstance(element);
      }
    });
    /**
     * jQuery
     */

    defineJQueryPlugin(Tab);

    /**
     * --------------------------------------------------------------------------
     * Bootstrap (v5.2.3): toast.js
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
     * --------------------------------------------------------------------------
     */
    /**
     * Constants
     */

    const NAME = 'toast';
    const DATA_KEY = 'bs.toast';
    const EVENT_KEY = `.${DATA_KEY}`;
    const EVENT_MOUSEOVER = `mouseover${EVENT_KEY}`;
    const EVENT_MOUSEOUT = `mouseout${EVENT_KEY}`;
    const EVENT_FOCUSIN = `focusin${EVENT_KEY}`;
    const EVENT_FOCUSOUT = `focusout${EVENT_KEY}`;
    const EVENT_HIDE = `hide${EVENT_KEY}`;
    const EVENT_HIDDEN = `hidden${EVENT_KEY}`;
    const EVENT_SHOW = `show${EVENT_KEY}`;
    const EVENT_SHOWN = `shown${EVENT_KEY}`;
    const CLASS_NAME_FADE = 'fade';
    const CLASS_NAME_HIDE = 'hide'; // @deprecated - kept here only for backwards compatibility

    const CLASS_NAME_SHOW = 'show';
    const CLASS_NAME_SHOWING = 'showing';
    const DefaultType = {
      animation: 'boolean',
      autohide: 'boolean',
      delay: 'number'
    };
    const Default = {
      animation: true,
      autohide: true,
      delay: 5000
    };
    /**
     * Class definition
     */

    class Toast extends BaseComponent {
      constructor(element, config) {
        super(element, config);
        this._timeout = null;
        this._hasMouseInteraction = false;
        this._hasKeyboardInteraction = false;

        this._setListeners();
      } // Getters


      static get Default() {
        return Default;
      }

      static get DefaultType() {
        return DefaultType;
      }

      static get NAME() {
        return NAME;
      } // Public


      show() {
        const showEvent = EventHandler.trigger(this._element, EVENT_SHOW);

        if (showEvent.defaultPrevented) {
          return;
        }

        this._clearTimeout();

        if (this._config.animation) {
          this._element.classList.add(CLASS_NAME_FADE);
        }

        const complete = () => {
          this._element.classList.remove(CLASS_NAME_SHOWING);

          EventHandler.trigger(this._element, EVENT_SHOWN);

          this._maybeScheduleHide();
        };

        this._element.classList.remove(CLASS_NAME_HIDE); // @deprecated


        reflow(this._element);

        this._element.classList.add(CLASS_NAME_SHOW, CLASS_NAME_SHOWING);

        this._queueCallback(complete, this._element, this._config.animation);
      }

      hide() {
        if (!this.isShown()) {
          return;
        }

        const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE);

        if (hideEvent.defaultPrevented) {
          return;
        }

        const complete = () => {
          this._element.classList.add(CLASS_NAME_HIDE); // @deprecated


          this._element.classList.remove(CLASS_NAME_SHOWING, CLASS_NAME_SHOW);

          EventHandler.trigger(this._element, EVENT_HIDDEN);
        };

        this._element.classList.add(CLASS_NAME_SHOWING);

        this._queueCallback(complete, this._element, this._config.animation);
      }

      dispose() {
        this._clearTimeout();

        if (this.isShown()) {
          this._element.classList.remove(CLASS_NAME_SHOW);
        }

        super.dispose();
      }

      isShown() {
        return this._element.classList.contains(CLASS_NAME_SHOW);
      } // Private


      _maybeScheduleHide() {
        if (!this._config.autohide) {
          return;
        }

        if (this._hasMouseInteraction || this._hasKeyboardInteraction) {
          return;
        }

        this._timeout = setTimeout(() => {
          this.hide();
        }, this._config.delay);
      }

      _onInteraction(event, isInteracting) {
        switch (event.type) {
          case 'mouseover':
          case 'mouseout':
            {
              this._hasMouseInteraction = isInteracting;
              break;
            }

          case 'focusin':
          case 'focusout':
            {
              this._hasKeyboardInteraction = isInteracting;
              break;
            }
        }

        if (isInteracting) {
          this._clearTimeout();

          return;
        }

        const nextElement = event.relatedTarget;

        if (this._element === nextElement || this._element.contains(nextElement)) {
          return;
        }

        this._maybeScheduleHide();
      }

      _setListeners() {
        EventHandler.on(this._element, EVENT_MOUSEOVER, event => this._onInteraction(event, true));
        EventHandler.on(this._element, EVENT_MOUSEOUT, event => this._onInteraction(event, false));
        EventHandler.on(this._element, EVENT_FOCUSIN, event => this._onInteraction(event, true));
        EventHandler.on(this._element, EVENT_FOCUSOUT, event => this._onInteraction(event, false));
      }

      _clearTimeout() {
        clearTimeout(this._timeout);
        this._timeout = null;
      } // Static


      static jQueryInterface(config) {
        return this.each(function () {
          const data = Toast.getOrCreateInstance(this, config);

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError(`No method named "${config}"`);
            }

            data[config](this);
          }
        });
      }

    }
    /**
     * Data API implementation
     */


    enableDismissTrigger(Toast);
    /**
     * jQuery
     */

    defineJQueryPlugin(Toast);

    const getProducts = async () => {
        try {
            const response = await fetch("/api.json").then((res) => res.json());
            const { products } = await response;

            return products;
        } catch (error) {
            console.warn("Ocurrió un error al obtener los productos.");
        }
    };

    const addProduct = async (product) => {
        try {
            const {code, name, stock} = product;
            const response = await fetch("http://localhost/addProduct", {
                method: "POST",
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify({
                    code,
                    name, 
                    stock,
                }),
            }).then((res) => res.json());

            const { data, status } = await response;

            console.log(data);
        } catch (error) { }
    };

    const addStock = async (id, stock) => {
        try {
            const response = await fetch("http://localhost/addStock", {
                method: "POST",
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify({
                    id: "",
                    stock: "",
                }),
            }).then((res) => res.json());

            const { data, status } = await response;

            console.log(data);
        } catch (error) { }
    };

    const removeStock = async (id, stock) => {
        try {
            const response = await fetch("http://localhost/removeStock", {
                method: "POST",
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify({
                    id: "",
                    stock: "",
                }),
            }).then((res) => res.json());

            const { data, status } = await response;

            console.log(data);
        } catch (error) { }
    };

    /* src\components\Add-Product.svelte generated by Svelte v3.55.1 */
    const file$a = "src\\components\\Add-Product.svelte";

    function create_fragment$a(ctx) {
    	let div10;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let i0;
    	let t2;
    	let div9;
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let t3;
    	let span0;
    	let t5;
    	let div3;
    	let input0;
    	let t6;
    	let div4;
    	let textarea;
    	let t7;
    	let div5;
    	let input1;
    	let t8;
    	let span1;
    	let t10;
    	let div6;
    	let input2;
    	let t11;
    	let span2;
    	let t13;
    	let div8;
    	let button1;
    	let i1;
    	let t14;
    	let t15;
    	let div7;
    	let small;
    	let t16;
    	let div7_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Registrar Producto";
    			t1 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t2 = space();
    			div9 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t3 = space();
    			span0 = element("span");
    			span0.textContent = "Ingresa la información del producto.";
    			t5 = space();
    			div3 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div4 = element("div");
    			textarea = element("textarea");
    			t7 = space();
    			div5 = element("div");
    			input1 = element("input");
    			t8 = space();
    			span1 = element("span");
    			span1.textContent = "Cantidad con la que se registra el producto en el inventario.";
    			t10 = space();
    			div6 = element("div");
    			input2 = element("input");
    			t11 = space();
    			span2 = element("span");
    			span2.textContent = "Cantidad mínima que debe tener el producto en el inventario.";
    			t13 = space();
    			div8 = element("div");
    			button1 = element("button");
    			i1 = element("i");
    			t14 = text(" Registrar Producto");
    			t15 = space();
    			div7 = element("div");
    			small = element("small");
    			t16 = text(/*alertContent*/ ctx[0]);
    			attr_dev(h5, "class", "offcanvas-title text-white");
    			add_location(h5, file$a, 37, 4, 966);
    			attr_dev(i0, "class", "bi bi-x-lg");
    			add_location(i0, file$a, 46, 25, 1305);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-danger");
    			set_style(button0, "color", "#ffffff");
    			set_style(button0, "border-radius", "100%");
    			set_style(button0, "width", "40px");
    			set_style(button0, "height", "40px");
    			set_style(button0, "background", "#1c1f25", 1);
    			set_style(button0, "border-color", "#1c1f25");
    			attr_dev(button0, "data-bs-dismiss", "offcanvas");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$a, 39, 4, 1036);
    			attr_dev(div0, "class", "offcanvas-header");
    			add_location(div0, file$a, 36, 2, 930);
    			if (!src_url_equal(img.src, img_src_value = "https://img.icons8.com/fluency/80/box.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$a, 56, 8, 1688);
    			attr_dev(div1, "class", "rounded-circle d-flex flex-column justify-content-center align-items-center");
    			set_style(div1, "width", "120px");
    			set_style(div1, "height", "120px");
    			set_style(div1, "background-color", "rgb(28 31 37 / 32%)");
    			add_location(div1, file$a, 52, 6, 1488);
    			attr_dev(span0, "class", "form-text text-sm text-center mt-3");
    			add_location(span0, file$a, 58, 6, 1772);
    			attr_dev(div2, "class", "d-flex flex-column justify-content-center align-items-center mt-2");
    			add_location(div2, file$a, 49, 4, 1388);
    			attr_dev(input0, "class", "form-control w-75 mt-3");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Código");
    			add_location(input0, file$a, 64, 6, 1984);
    			attr_dev(div3, "class", "d-flex flex-column justify-content-center align-items-center");
    			add_location(div3, file$a, 63, 4, 1902);
    			attr_dev(textarea, "class", "form-control w-75 mt-3");
    			attr_dev(textarea, "type", "text");
    			attr_dev(textarea, "placeholder", "Descripción");
    			add_location(textarea, file$a, 72, 6, 2226);
    			attr_dev(div4, "class", "d-flex flex-column justify-content-center align-items-center");
    			add_location(div4, file$a, 71, 4, 2144);
    			attr_dev(input1, "class", "form-control w-75 mt-3");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "placeholder", "Cantidad");
    			attr_dev(input1, "minlength", "1");
    			add_location(input1, file$a, 80, 6, 2476);
    			attr_dev(span1, "class", "form-text");
    			set_style(span1, "font-size", "10px");
    			add_location(span1, file$a, 88, 6, 2701);
    			attr_dev(div5, "class", "d-flex flex-column justify-content-center align-items-center");
    			add_location(div5, file$a, 79, 4, 2394);
    			attr_dev(input2, "class", "form-control w-75 mt-3");
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "placeholder", "Cantidad Mínima");
    			attr_dev(input2, "minlength", "1");
    			add_location(input2, file$a, 91, 6, 2918);
    			attr_dev(span2, "class", "form-text");
    			set_style(span2, "font-size", "10px");
    			add_location(span2, file$a, 99, 6, 3150);
    			attr_dev(div6, "class", "d-flex flex-column justify-content-center align-items-center");
    			add_location(div6, file$a, 90, 4, 2836);
    			attr_dev(i1, "class", "bi bi-check-circle-fill");
    			add_location(i1, file$a, 110, 9, 3584);
    			attr_dev(button1, "class", "w-75 btn btn-primary btn-lg mb-4");
    			attr_dev(button1, "type", "button");
    			set_style(button1, "background-color", "#5865f2");
    			set_style(button1, "border-color", "#5865f2");
    			add_location(button1, file$a, 105, 6, 3386);
    			add_location(small, file$a, 114, 8, 3747);
    			attr_dev(div7, "class", div7_class_value = "w-75 alert alert-warning fade " + /*isShowAlert*/ ctx[2]);
    			attr_dev(div7, "role", "alert");
    			add_location(div7, file$a, 113, 6, 3667);
    			attr_dev(div8, "class", "d-flex flex-column justify-content-center align-items-center mt-4");
    			add_location(div8, file$a, 102, 4, 3286);
    			attr_dev(div9, "class", "offcanvas-body");
    			add_location(div9, file$a, 48, 2, 1354);
    			attr_dev(div10, "class", "offcanvas offcanvas-end");
    			attr_dev(div10, "tabindex", "-1");
    			attr_dev(div10, "id", "offcanvasNewProduct");
    			add_location(div10, file$a, 35, 0, 850);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div10, t2);
    			append_dev(div10, div9);
    			append_dev(div9, div2);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			append_dev(div2, t3);
    			append_dev(div2, span0);
    			append_dev(div9, t5);
    			append_dev(div9, div3);
    			append_dev(div3, input0);
    			set_input_value(input0, /*product*/ ctx[1].code);
    			append_dev(div9, t6);
    			append_dev(div9, div4);
    			append_dev(div4, textarea);
    			set_input_value(textarea, /*product*/ ctx[1].name);
    			append_dev(div9, t7);
    			append_dev(div9, div5);
    			append_dev(div5, input1);
    			set_input_value(input1, /*product*/ ctx[1].stock);
    			append_dev(div5, t8);
    			append_dev(div5, span1);
    			append_dev(div9, t10);
    			append_dev(div9, div6);
    			append_dev(div6, input2);
    			set_input_value(input2, /*product*/ ctx[1].stock);
    			append_dev(div6, t11);
    			append_dev(div6, span2);
    			append_dev(div9, t13);
    			append_dev(div9, div8);
    			append_dev(div8, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t14);
    			append_dev(div8, t15);
    			append_dev(div8, div7);
    			append_dev(div7, small);
    			append_dev(small, t16);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(input1, "input", prevent_default(/*handleInput*/ ctx[3]), false, true, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[8]),
    					listen_dev(input2, "input", prevent_default(/*handleInput*/ ctx[3]), false, true, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*product*/ 2 && input0.value !== /*product*/ ctx[1].code) {
    				set_input_value(input0, /*product*/ ctx[1].code);
    			}

    			if (dirty & /*product*/ 2) {
    				set_input_value(textarea, /*product*/ ctx[1].name);
    			}

    			if (dirty & /*product*/ 2 && to_number(input1.value) !== /*product*/ ctx[1].stock) {
    				set_input_value(input1, /*product*/ ctx[1].stock);
    			}

    			if (dirty & /*product*/ 2 && to_number(input2.value) !== /*product*/ ctx[1].stock) {
    				set_input_value(input2, /*product*/ ctx[1].stock);
    			}

    			if (dirty & /*alertContent*/ 1) set_data_dev(t16, /*alertContent*/ ctx[0]);

    			if (dirty & /*isShowAlert*/ 4 && div7_class_value !== (div7_class_value = "w-75 alert alert-warning fade " + /*isShowAlert*/ ctx[2])) {
    				attr_dev(div7, "class", div7_class_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let alertContent;
    	let isShowAlert;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Add_Product', slots, []);
    	let product = { code: "", name: "", stock: "" };
    	const isNumber = val => !isNaN(val);

    	const handleInput = e => {
    		if (isNumber(e.target.value)) {
    			$$invalidate(1, product.stock = e.target.value, product);
    		}
    	};

    	const saveProduct = async () => {
    		if (!product.code.trim()) {
    			$$invalidate(0, alertContent = "No se ha ingresado el código");
    		} else if (!product.name.trim()) {
    			$$invalidate(0, alertContent = "No se ha ingresado la descripción");
    		} else if (product.stock == "") {
    			$$invalidate(0, alertContent = "No se ha ingresado la cantidad");
    		} else {
    			$$invalidate(0, alertContent = "");
    			await addProduct(product);
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Add_Product> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		product.code = this.value;
    		$$invalidate(1, product);
    	}

    	function textarea_input_handler() {
    		product.name = this.value;
    		$$invalidate(1, product);
    	}

    	function input1_input_handler() {
    		product.stock = to_number(this.value);
    		$$invalidate(1, product);
    	}

    	function input2_input_handler() {
    		product.stock = to_number(this.value);
    		$$invalidate(1, product);
    	}

    	const click_handler = () => saveProduct();

    	$$self.$capture_state = () => ({
    		addProduct,
    		product,
    		isNumber,
    		handleInput,
    		saveProduct,
    		alertContent,
    		isShowAlert
    	});

    	$$self.$inject_state = $$props => {
    		if ('product' in $$props) $$invalidate(1, product = $$props.product);
    		if ('alertContent' in $$props) $$invalidate(0, alertContent = $$props.alertContent);
    		if ('isShowAlert' in $$props) $$invalidate(2, isShowAlert = $$props.isShowAlert);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*alertContent*/ 1) {
    			$$invalidate(2, isShowAlert = alertContent != "" ? "show" : "");
    		}
    	};

    	$$invalidate(0, alertContent = "");

    	return [
    		alertContent,
    		product,
    		isShowAlert,
    		handleInput,
    		saveProduct,
    		input0_input_handler,
    		textarea_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		click_handler
    	];
    }

    class Add_Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Add_Product",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\components\Searchbar.svelte generated by Svelte v3.55.1 */
    const file$9 = "src\\components\\Searchbar.svelte";

    function create_fragment$9(ctx) {
    	let div6;
    	let div3;
    	let div2;
    	let div0;
    	let span;
    	let i0;
    	let t0;
    	let input;
    	let t1;
    	let div1;
    	let t3;
    	let div5;
    	let div4;
    	let button0;
    	let i1;
    	let t4;
    	let t5;
    	let button1;
    	let i2;
    	let t6;
    	let t7;
    	let button2;
    	let i3;
    	let t8;
    	let t9;
    	let addproduct;
    	let current;
    	let mounted;
    	let dispose;
    	addproduct = new Add_Product({ $$inline: true });

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			i0 = element("i");
    			t0 = space();
    			input = element("input");
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Ingresa o escanea el código del producto";
    			t3 = space();
    			div5 = element("div");
    			div4 = element("div");
    			button0 = element("button");
    			i1 = element("i");
    			t4 = text(" Entradas");
    			t5 = space();
    			button1 = element("button");
    			i2 = element("i");
    			t6 = text(" Salidas");
    			t7 = space();
    			button2 = element("button");
    			i3 = element("i");
    			t8 = text(" Nuevo Producto");
    			t9 = space();
    			create_component(addproduct.$$.fragment);
    			attr_dev(i0, "class", "bi bi-search");
    			add_location(i0, file$9, 9, 39, 253);
    			attr_dev(span, "class", "input-group-text");
    			add_location(span, file$9, 9, 8, 222);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control form-control-lg");
    			attr_dev(input, "placeholder", "Buscar Producto...");
    			add_location(input, file$9, 10, 8, 296);
    			attr_dev(div0, "class", "input-group");
    			add_location(div0, file$9, 8, 6, 187);
    			attr_dev(div1, "class", "form-text");
    			add_location(div1, file$9, 18, 6, 502);
    			attr_dev(div2, "class", "mb-3");
    			add_location(div2, file$9, 7, 4, 161);
    			attr_dev(div3, "class", "col-lg-5 col-sm-12");
    			add_location(div3, file$9, 6, 2, 123);
    			attr_dev(i1, "class", "bi bi-arrow-down-circle-fill");
    			add_location(i1, file$9, 29, 9, 942);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-lg btn-primary shadow-sm");
    			set_style(button0, "background-color", "#1c1f25");
    			set_style(button0, "border-color", "#1c1f25");
    			set_style(button0, "color", "#FFFFFF");
    			attr_dev(button0, "data-bs-toggle", "offcanvas");
    			attr_dev(button0, "data-bs-target", "#offcanvasInputs");
    			add_location(button0, file$9, 23, 6, 688);
    			attr_dev(i2, "class", "bi bi-arrow-up-circle-fill");
    			add_location(i2, file$9, 37, 9, 1279);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-lg btn-primary mx-2 shadow-sm");
    			set_style(button1, "background-color", "#1c1f25");
    			set_style(button1, "border-color", "#1c1f25");
    			set_style(button1, "color", "#FFFFFF");
    			attr_dev(button1, "data-bs-toggle", "offcanvas");
    			attr_dev(button1, "data-bs-target", "#offcanvasOutputs");
    			add_location(button1, file$9, 31, 6, 1020);
    			attr_dev(i3, "class", "bi bi-plus-circle-fill");
    			add_location(i3, file$9, 45, 9, 1611);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-lg btn-primary shadow-sm");
    			set_style(button2, "background-color", "#1c1f25");
    			set_style(button2, "border-color", "#1c1f25");
    			set_style(button2, "color", "#FFFFFF");
    			attr_dev(button2, "data-bs-toggle", "offcanvas");
    			attr_dev(button2, "data-bs-target", "#offcanvasNewProduct");
    			add_location(button2, file$9, 39, 6, 1354);
    			attr_dev(div4, "class", "mb-3 d-flex justify-content-end");
    			add_location(div4, file$9, 22, 4, 635);
    			attr_dev(div5, "class", "col-lg-7 col-sm-12");
    			add_location(div5, file$9, 21, 2, 597);
    			attr_dev(div6, "class", "row mt-4");
    			add_location(div6, file$9, 5, 0, 97);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(span, i0);
    			append_dev(div0, t0);
    			append_dev(div0, input);
    			set_input_value(input, /*search*/ ctx[0]);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(button0, i1);
    			append_dev(button0, t4);
    			append_dev(div4, t5);
    			append_dev(div4, button1);
    			append_dev(button1, i2);
    			append_dev(button1, t6);
    			append_dev(div4, t7);
    			append_dev(div4, button2);
    			append_dev(button2, i3);
    			append_dev(button2, t8);
    			insert_dev(target, t9, anchor);
    			mount_component(addproduct, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(input, "input", /*input_handler*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*search*/ 1 && input.value !== /*search*/ ctx[0]) {
    				set_input_value(input, /*search*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(addproduct.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(addproduct.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t9);
    			destroy_component(addproduct, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Searchbar', slots, []);
    	let search = '';
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Searchbar> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_input_handler() {
    		search = this.value;
    		$$invalidate(0, search);
    	}

    	$$self.$capture_state = () => ({ AddProduct: Add_Product, search });

    	$$self.$inject_state = $$props => {
    		if ('search' in $$props) $$invalidate(0, search = $$props.search);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [search, input_handler, input_input_handler];
    }

    class Searchbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Searchbar",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\components\Header.svelte generated by Svelte v3.55.1 */
    const file$8 = "src\\components\\Header.svelte";

    function create_fragment$8(ctx) {
    	let div2;
    	let div0;
    	let i;
    	let t0;
    	let div1;
    	let h1;
    	let t2;
    	let small;
    	let t4;
    	let searchbar;
    	let current;
    	searchbar = new Searchbar({ $$inline: true });
    	searchbar.$on("input", /*input_handler*/ ctx[0]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Sistema de Inventario";
    			t2 = space();
    			small = element("small");
    			small.textContent = "Entradas y Salidas";
    			t4 = space();
    			create_component(searchbar.$$.fragment);
    			attr_dev(i, "class", "bi bi-box-fill mr-2");
    			set_style(i, "font-size", "30px");
    			add_location(i, file$8, 10, 6, 260);
    			set_style(div0, "width", "42px");
    			set_style(div0, "height", "42px");
    			add_location(div0, file$8, 9, 4, 213);
    			attr_dev(h1, "class", "h6 mb-0 text-white lh-1");
    			add_location(h1, file$8, 13, 6, 362);
    			add_location(small, file$8, 14, 6, 432);
    			attr_dev(div1, "class", "lh-1");
    			add_location(div1, file$8, 12, 4, 336);
    			attr_dev(div2, "class", "d-flex align-items-center p-3 my-4 text-white rounded shadow");
    			set_style(div2, "background-color", "#5865f2");
    			add_location(div2, file$8, 5, 2, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, i);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, small);
    			insert_dev(target, t4, anchor);
    			mount_component(searchbar, target, anchor);
    			current = true;
    		},
    		p: noop$1,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(searchbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(searchbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t4);
    			destroy_component(searchbar, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$capture_state = () => ({ Searchbar });
    	return [input_handler];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\components\Product.svelte generated by Svelte v3.55.1 */
    const file$7 = "src\\components\\Product.svelte";

    function create_fragment$7(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h6;
    	let t0;
    	let t1;
    	let p;
    	let span;
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h6 = element("h6");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			p = element("p");
    			span = element("span");
    			t2 = text("Stock: ");
    			t3 = text(/*stock*/ ctx[1]);
    			attr_dev(h6, "class", "card-title text-white");
    			add_location(h6, file$7, 21, 6, 605);
    			attr_dev(span, "class", "badge text-bg-success");
    			set_style(span, "background-color", "#1c1f25", 1);
    			set_style(span, "color", "#69c76b", 1);
    			add_location(span, file$7, 22, 49, 701);
    			attr_dev(p, "class", "card-text text-muted text-white");
    			add_location(p, file$7, 22, 6, 658);
    			attr_dev(div0, "class", "card-body");
    			add_location(div0, file$7, 20, 4, 574);
    			attr_dev(div1, "data-bs-toggle", "offcanvas");
    			attr_dev(div1, "data-bs-target", "#offcanvasInventory");
    			attr_dev(div1, "class", "card");
    			set_style(div1, "cursor", "pointer");
    			set_style(div1, "background-color", "#13161b");
    			add_location(div1, file$7, 19, 2, 407);
    			attr_dev(div2, "class", "col-lg-4 col-sm-12 mt-4");
    			add_location(div2, file$7, 17, 0, 306);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h6);
    			append_dev(h6, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(p, span);
    			append_dev(span, t2);
    			append_dev(span, t3);

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*updateInventory*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t0, /*name*/ ctx[0]);
    			if (dirty & /*stock*/ 2) set_data_dev(t3, /*stock*/ ctx[1]);
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Product', slots, []);
    	let { id } = $$props;
    	let { name } = $$props;
    	let { stock } = $$props;
    	const dispatch = createEventDispatcher();

    	const updateInventory = () => {
    		dispatch('updateInventory', { id });
    	};

    	$$self.$$.on_mount.push(function () {
    		if (id === undefined && !('id' in $$props || $$self.$$.bound[$$self.$$.props['id']])) {
    			console.warn("<Product> was created without expected prop 'id'");
    		}

    		if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
    			console.warn("<Product> was created without expected prop 'name'");
    		}

    		if (stock === undefined && !('stock' in $$props || $$self.$$.bound[$$self.$$.props['stock']])) {
    			console.warn("<Product> was created without expected prop 'stock'");
    		}
    	});

    	const writable_props = ['id', 'name', 'stock'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('id' in $$props) $$invalidate(3, id = $$props.id);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('stock' in $$props) $$invalidate(1, stock = $$props.stock);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		id,
    		name,
    		stock,
    		dispatch,
    		updateInventory
    	});

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate(3, id = $$props.id);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('stock' in $$props) $$invalidate(1, stock = $$props.stock);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, stock, updateInventory, id];
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { id: 3, name: 0, stock: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get id() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stock() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stock(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Add-Inventory.svelte generated by Svelte v3.55.1 */
    const file$6 = "src\\components\\Add-Inventory.svelte";

    function create_fragment$6(ctx) {
    	let div15;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let i0;
    	let t2;
    	let div14;
    	let ul;
    	let li0;
    	let button1;
    	let i1;
    	let t3;
    	let t4;
    	let li1;
    	let button2;
    	let i2;
    	let t5;
    	let t6;
    	let div13;
    	let div6;
    	let div2;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t7;
    	let span0;
    	let t9;
    	let div3;
    	let input0;
    	let t10;
    	let div5;
    	let button3;
    	let i3;
    	let t11;
    	let t12;
    	let div4;
    	let small0;
    	let t13;
    	let div4_class_value;
    	let t14;
    	let div12;
    	let div8;
    	let div7;
    	let img1;
    	let img1_src_value;
    	let t15;
    	let span1;
    	let t17;
    	let div9;
    	let input1;
    	let t18;
    	let div11;
    	let button4;
    	let i4;
    	let t19;
    	let t20;
    	let div10;
    	let small1;
    	let t21;
    	let div10_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div15 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Inventario";
    			t1 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t2 = space();
    			div14 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			button1 = element("button");
    			i1 = element("i");
    			t3 = text(" Nueva Entrada");
    			t4 = space();
    			li1 = element("li");
    			button2 = element("button");
    			i2 = element("i");
    			t5 = text(" Nueva Salida");
    			t6 = space();
    			div13 = element("div");
    			div6 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			img0 = element("img");
    			t7 = space();
    			span0 = element("span");
    			span0.textContent = "Ingresa la cantidad que deseas registrar como entrada.";
    			t9 = space();
    			div3 = element("div");
    			input0 = element("input");
    			t10 = space();
    			div5 = element("div");
    			button3 = element("button");
    			i3 = element("i");
    			t11 = text(" Registrar Entrada");
    			t12 = space();
    			div4 = element("div");
    			small0 = element("small");
    			t13 = text(/*alertContent*/ ctx[1]);
    			t14 = space();
    			div12 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			img1 = element("img");
    			t15 = space();
    			span1 = element("span");
    			span1.textContent = "Ingresa la cantidad que deseas registrar como salida.";
    			t17 = space();
    			div9 = element("div");
    			input1 = element("input");
    			t18 = space();
    			div11 = element("div");
    			button4 = element("button");
    			i4 = element("i");
    			t19 = text(" Registrar Salida");
    			t20 = space();
    			div10 = element("div");
    			small1 = element("small");
    			t21 = text(/*alertContent*/ ctx[1]);
    			attr_dev(h5, "class", "offcanvas-title text-white");
    			add_location(h5, file$6, 42, 4, 969);
    			attr_dev(i0, "class", "bi bi-x-lg");
    			add_location(i0, file$6, 48, 25, 1283);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-danger");
    			set_style(button0, "color", "#ffffff");
    			set_style(button0, "border-radius", "100%");
    			set_style(button0, "width", "40px");
    			set_style(button0, "height", "40px");
    			set_style(button0, "background", "#1c1f25", 1);
    			set_style(button0, "border-color", "#1c1f25");
    			attr_dev(button0, "data-bs-dismiss", "offcanvas");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$6, 43, 4, 1029);
    			attr_dev(div0, "class", "offcanvas-header");
    			add_location(div0, file$6, 41, 2, 933);
    			attr_dev(i1, "class", "bi bi-arrow-down-circle-fill");
    			add_location(i1, file$6, 69, 11, 1934);
    			attr_dev(button1, "class", "nav-link active");
    			attr_dev(button1, "id", "pills-entrances-tab");
    			attr_dev(button1, "data-bs-toggle", "pill");
    			attr_dev(button1, "data-bs-target", "#pills-entrances");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "role", "tab");
    			attr_dev(button1, "aria-controls", "pills-entrances");
    			attr_dev(button1, "aria-selected", "true");
    			set_style(button1, "border-radius", "30px");
    			add_location(button1, file$6, 58, 8, 1564);
    			attr_dev(li0, "class", "nav-item rounded-2 w-50");
    			attr_dev(li0, "role", "presentation");
    			add_location(li0, file$6, 57, 6, 1498);
    			attr_dev(i2, "class", "bi bi-arrow-up-circle-fill");
    			add_location(i2, file$6, 84, 11, 2447);
    			attr_dev(button2, "class", "nav-link");
    			attr_dev(button2, "id", "pills-exits-tab");
    			attr_dev(button2, "data-bs-toggle", "pill");
    			attr_dev(button2, "data-bs-target", "#pills-exits");
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "role", "tab");
    			attr_dev(button2, "aria-controls", "pills-exits");
    			attr_dev(button2, "aria-selected", "false");
    			set_style(button2, "border-radius", "30px");
    			add_location(button2, file$6, 73, 8, 2096);
    			attr_dev(li1, "class", "nav-item rounded-2 w-50");
    			attr_dev(li1, "role", "presentation");
    			add_location(li1, file$6, 72, 6, 2030);
    			attr_dev(ul, "class", "nav nav-pills mb-3 d-flex justify-content-center");
    			attr_dev(ul, "id", "pills-tab");
    			attr_dev(ul, "role", "tablist");
    			add_location(ul, file$6, 52, 4, 1372);
    			if (!src_url_equal(img0.src, img0_src_value = "https://img.icons8.com/fluency/80/delivered-box.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$6, 107, 12, 3186);
    			attr_dev(div1, "class", "rounded-circle d-flex flex-column justify-content-center align-items-center");
    			set_style(div1, "width", "120px");
    			set_style(div1, "height", "120px");
    			set_style(div1, "background-color", "rgb(28 31 37 / 32%)");
    			add_location(div1, file$6, 103, 10, 2970);
    			attr_dev(span0, "class", "form-text text-sm text-center");
    			add_location(span0, file$6, 112, 10, 3331);
    			attr_dev(div2, "class", "d-flex flex-column justify-content-center align-items-center mt-4");
    			add_location(div2, file$6, 100, 8, 2858);
    			attr_dev(input0, "class", "form-control w-75 mt-4");
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "placeholder", "Cantidad");
    			attr_dev(input0, "minlength", "1");
    			attr_dev(input0, "maxlength", "10");
    			add_location(input0, file$6, 120, 10, 3602);
    			attr_dev(div3, "class", "d-flex flex-column justify-content-center align-items-center mt-4");
    			add_location(div3, file$6, 117, 8, 3490);
    			attr_dev(i3, "class", "bi bi-arrow-down-circle-fill");
    			add_location(i3, file$6, 139, 13, 4230);
    			attr_dev(button3, "class", "w-75 btn btn-primary btn-lg mb-4");
    			attr_dev(button3, "type", "button");
    			set_style(button3, "background-color", "#5865f2");
    			set_style(button3, "border-color", "#5865f2");
    			add_location(button3, file$6, 134, 10, 4007);
    			add_location(small0, file$6, 150, 12, 4557);

    			attr_dev(div4, "class", div4_class_value = "w-75 alert alert-warning fade " + (/*stock*/ ctx[0] == '' && /*activeTab*/ ctx[2] == 1 && /*alertContent*/ ctx[1] != ''
    			? 'show'
    			: ''));

    			attr_dev(div4, "role", "alert");
    			add_location(div4, file$6, 142, 10, 4325);
    			attr_dev(div5, "class", "d-flex flex-column justify-content-center align-items-center mt-4");
    			add_location(div5, file$6, 131, 8, 3895);
    			attr_dev(div6, "class", "tab-pane fade show active");
    			attr_dev(div6, "id", "pills-entrances");
    			attr_dev(div6, "role", "tabpanel");
    			attr_dev(div6, "aria-labelledby", "pills-entrances-tab");
    			attr_dev(div6, "tabindex", "0");
    			add_location(div6, file$6, 93, 6, 2668);
    			if (!src_url_equal(img1.src, img1_src_value = "https://img.icons8.com/fluency/80/remove-delivery.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$6, 169, 12, 5151);
    			attr_dev(div7, "class", "rounded-circle d-flex flex-column justify-content-center align-items-center");
    			set_style(div7, "width", "120px");
    			set_style(div7, "height", "120px");
    			set_style(div7, "background-color", "rgb(28 31 37 / 32%)");
    			add_location(div7, file$6, 165, 10, 4935);
    			attr_dev(span1, "class", "form-text text-sm text-center");
    			add_location(span1, file$6, 174, 10, 5298);
    			attr_dev(div8, "class", "row d-flex flex-column justify-content-center align-items-center mt-4 mb-4");
    			add_location(div8, file$6, 162, 8, 4814);
    			attr_dev(input1, "class", "form-control w-75 mt-4");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "placeholder", "Cantidad");
    			attr_dev(input1, "minlength", "1");
    			attr_dev(input1, "maxlength", "10");
    			add_location(input1, file$6, 182, 10, 5568);
    			attr_dev(div9, "class", "d-flex flex-column justify-content-center align-items-center mt-4");
    			add_location(div9, file$6, 179, 8, 5456);
    			attr_dev(i4, "class", "bi bi-arrow-up-circle-fill");
    			add_location(i4, file$6, 201, 13, 6196);
    			attr_dev(button4, "class", "w-75 btn btn-primary btn-lg mb-4");
    			attr_dev(button4, "type", "button");
    			set_style(button4, "background-color", "#5865f2");
    			set_style(button4, "border-color", "#5865f2");
    			add_location(button4, file$6, 196, 10, 5973);
    			add_location(small1, file$6, 212, 12, 6520);

    			attr_dev(div10, "class", div10_class_value = "w-75 alert alert-warning fade " + (/*stock*/ ctx[0] == '' && /*activeTab*/ ctx[2] == 2 && /*alertContent*/ ctx[1] != ''
    			? 'show'
    			: ''));

    			attr_dev(div10, "role", "alert");
    			add_location(div10, file$6, 204, 10, 6288);
    			attr_dev(div11, "class", "d-flex flex-column justify-content-center align-items-center mt-4");
    			add_location(div11, file$6, 193, 8, 5861);
    			attr_dev(div12, "class", "tab-pane fade");
    			attr_dev(div12, "id", "pills-exits");
    			attr_dev(div12, "role", "tabpanel");
    			attr_dev(div12, "aria-labelledby", "pills-exits-tab");
    			attr_dev(div12, "tabindex", "0");
    			add_location(div12, file$6, 155, 6, 4644);
    			attr_dev(div13, "class", "tab-content d-flex flex-column justify-content-center");
    			attr_dev(div13, "id", "pills-tabContent");
    			add_location(div13, file$6, 89, 4, 2551);
    			attr_dev(div14, "class", "offcanvas-body");
    			add_location(div14, file$6, 51, 2, 1338);
    			attr_dev(div15, "class", "offcanvas offcanvas-end");
    			attr_dev(div15, "tabindex", "-1");
    			attr_dev(div15, "id", "offcanvasInventory");
    			add_location(div15, file$6, 40, 0, 854);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div15, t2);
    			append_dev(div15, div14);
    			append_dev(div14, ul);
    			append_dev(ul, li0);
    			append_dev(li0, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t3);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, button2);
    			append_dev(button2, i2);
    			append_dev(button2, t5);
    			append_dev(div14, t6);
    			append_dev(div14, div13);
    			append_dev(div13, div6);
    			append_dev(div6, div2);
    			append_dev(div2, div1);
    			append_dev(div1, img0);
    			append_dev(div2, t7);
    			append_dev(div2, span0);
    			append_dev(div6, t9);
    			append_dev(div6, div3);
    			append_dev(div3, input0);
    			set_input_value(input0, /*stock*/ ctx[0]);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, button3);
    			append_dev(button3, i3);
    			append_dev(button3, t11);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, small0);
    			append_dev(small0, t13);
    			append_dev(div13, t14);
    			append_dev(div13, div12);
    			append_dev(div12, div8);
    			append_dev(div8, div7);
    			append_dev(div7, img1);
    			append_dev(div8, t15);
    			append_dev(div8, span1);
    			append_dev(div12, t17);
    			append_dev(div12, div9);
    			append_dev(div9, input1);
    			set_input_value(input1, /*stock*/ ctx[0]);
    			append_dev(div12, t18);
    			append_dev(div12, div11);
    			append_dev(div11, button4);
    			append_dev(button4, i4);
    			append_dev(button4, t19);
    			append_dev(div11, t20);
    			append_dev(div11, div10);
    			append_dev(div10, small1);
    			append_dev(small1, t21);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button1, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input0, "input", prevent_default(/*handleInput*/ ctx[3]), false, true, false),
    					listen_dev(button3, "click", /*click_handler_2*/ ctx[10], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(input1, "input", prevent_default(/*handleInput*/ ctx[3]), false, true, false),
    					listen_dev(button4, "click", /*click_handler_3*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*stock*/ 1 && to_number(input0.value) !== /*stock*/ ctx[0]) {
    				set_input_value(input0, /*stock*/ ctx[0]);
    			}

    			if (dirty & /*alertContent*/ 2) set_data_dev(t13, /*alertContent*/ ctx[1]);

    			if (dirty & /*stock, activeTab, alertContent*/ 7 && div4_class_value !== (div4_class_value = "w-75 alert alert-warning fade " + (/*stock*/ ctx[0] == '' && /*activeTab*/ ctx[2] == 1 && /*alertContent*/ ctx[1] != ''
    			? 'show'
    			: ''))) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if (dirty & /*stock*/ 1 && to_number(input1.value) !== /*stock*/ ctx[0]) {
    				set_input_value(input1, /*stock*/ ctx[0]);
    			}

    			if (dirty & /*alertContent*/ 2) set_data_dev(t21, /*alertContent*/ ctx[1]);

    			if (dirty & /*stock, activeTab, alertContent*/ 7 && div10_class_value !== (div10_class_value = "w-75 alert alert-warning fade " + (/*stock*/ ctx[0] == '' && /*activeTab*/ ctx[2] == 2 && /*alertContent*/ ctx[1] != ''
    			? 'show'
    			: ''))) {
    				attr_dev(div10, "class", div10_class_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let activeTab;
    	let stock;
    	let alertContent;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Add_Inventory', slots, []);
    	let { productId } = $$props;
    	const isNumber = val => !isNaN(val);

    	const handleInput = e => {
    		if (isNumber(e.target.value)) {
    			$$invalidate(0, stock = e.target.value);
    		}
    	};

    	const updateInventory = async type => {
    		if (stock == "") {
    			$$invalidate(1, alertContent = "No se ha ingresado la cantidad");
    			return;
    		}

    		$$invalidate(1, alertContent = "");

    		if (type == 1) {
    			await addStock();
    		} else {
    			await removeStock();
    		}
    	};

    	const initTab = tab => {
    		$$invalidate(2, activeTab = tab);
    		$$invalidate(1, alertContent = "");
    		$$invalidate(0, stock = "");
    	};

    	$$self.$$.on_mount.push(function () {
    		if (productId === undefined && !('productId' in $$props || $$self.$$.bound[$$self.$$.props['productId']])) {
    			console.warn("<Add_Inventory> was created without expected prop 'productId'");
    		}
    	});

    	const writable_props = ['productId'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Add_Inventory> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => initTab(1);
    	const click_handler_1 = () => initTab(2);

    	function input0_input_handler() {
    		stock = to_number(this.value);
    		$$invalidate(0, stock);
    	}

    	const click_handler_2 = () => updateInventory(1);

    	function input1_input_handler() {
    		stock = to_number(this.value);
    		$$invalidate(0, stock);
    	}

    	const click_handler_3 = () => updateInventory(2);

    	$$self.$$set = $$props => {
    		if ('productId' in $$props) $$invalidate(6, productId = $$props.productId);
    	};

    	$$self.$capture_state = () => ({
    		addStock,
    		removeStock,
    		productId,
    		isNumber,
    		handleInput,
    		updateInventory,
    		initTab,
    		stock,
    		alertContent,
    		activeTab
    	});

    	$$self.$inject_state = $$props => {
    		if ('productId' in $$props) $$invalidate(6, productId = $$props.productId);
    		if ('stock' in $$props) $$invalidate(0, stock = $$props.stock);
    		if ('alertContent' in $$props) $$invalidate(1, alertContent = $$props.alertContent);
    		if ('activeTab' in $$props) $$invalidate(2, activeTab = $$props.activeTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(2, activeTab = 1);
    	$$invalidate(0, stock = "");
    	$$invalidate(1, alertContent = "");

    	return [
    		stock,
    		alertContent,
    		activeTab,
    		handleInput,
    		updateInventory,
    		initTab,
    		productId,
    		click_handler,
    		click_handler_1,
    		input0_input_handler,
    		click_handler_2,
    		input1_input_handler,
    		click_handler_3
    	];
    }

    class Add_Inventory extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { productId: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Add_Inventory",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get productId() {
    		throw new Error("<Add_Inventory>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set productId(value) {
    		throw new Error("<Add_Inventory>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Pagination.svelte generated by Svelte v3.55.1 */

    const file$5 = "src\\components\\Pagination.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (18:2) {#each totalPages as pg, i}
    function create_each_block$1(ctx) {
    	let li;
    	let button;
    	let t_value = /*i*/ ctx[11] + 1 + "";
    	let t;
    	let li_class_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[7](/*i*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "page-link");
    			add_location(button, file$5, 19, 6, 482);
    			attr_dev(li, "class", li_class_value = "page-item " + (/*page*/ ctx[1] == /*i*/ ctx[11] ? 'active' : ''));
    			add_location(li, file$5, 18, 4, 424);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*page*/ 2 && li_class_value !== (li_class_value = "page-item " + (/*page*/ ctx[1] == /*i*/ ctx[11] ? 'active' : ''))) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(18:2) {#each totalPages as pg, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let ul;
    	let li0;
    	let button0;
    	let t0;
    	let button0_class_value;
    	let t1;
    	let t2;
    	let li1;
    	let button1;
    	let t3;
    	let button1_class_value;
    	let ul_class_value;
    	let mounted;
    	let dispose;
    	let each_value = /*totalPages*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li0 = element("li");
    			button0 = element("button");
    			t0 = text("Anterior");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			li1 = element("li");
    			button1 = element("button");
    			t3 = text("Siguiente");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", button0_class_value = "page-link " + /*disabledFirst*/ ctx[3]);
    			add_location(button0, file$5, 8, 4, 227);
    			attr_dev(li0, "class", "page-item");
    			add_location(li0, file$5, 7, 2, 199);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", button1_class_value = "page-link " + /*disabledLast*/ ctx[2]);
    			add_location(button1, file$5, 26, 4, 640);
    			attr_dev(li1, "class", "page-item");
    			add_location(li1, file$5, 25, 2, 612);
    			attr_dev(ul, "class", ul_class_value = "pagination mt-4 " + /*isVisible*/ ctx[5]);
    			add_location(ul, file$5, 6, 0, 155);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, button0);
    			append_dev(button0, t0);
    			append_dev(ul, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, button1);
    			append_dev(button1, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*disabledFirst*/ 8 && button0_class_value !== (button0_class_value = "page-link " + /*disabledFirst*/ ctx[3])) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (dirty & /*page, setPage, totalPages*/ 19) {
    				each_value = /*totalPages*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*disabledLast*/ 4 && button1_class_value !== (button1_class_value = "page-link " + /*disabledLast*/ ctx[2])) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*isVisible*/ 32 && ul_class_value !== (ul_class_value = "pagination mt-4 " + /*isVisible*/ ctx[5])) {
    				attr_dev(ul, "class", ul_class_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let isVisible;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Pagination', slots, []);
    	let { totalPages, page, disabledLast, disabledFirst, setPage } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (totalPages === undefined && !('totalPages' in $$props || $$self.$$.bound[$$self.$$.props['totalPages']])) {
    			console.warn("<Pagination> was created without expected prop 'totalPages'");
    		}

    		if (page === undefined && !('page' in $$props || $$self.$$.bound[$$self.$$.props['page']])) {
    			console.warn("<Pagination> was created without expected prop 'page'");
    		}

    		if (disabledLast === undefined && !('disabledLast' in $$props || $$self.$$.bound[$$self.$$.props['disabledLast']])) {
    			console.warn("<Pagination> was created without expected prop 'disabledLast'");
    		}

    		if (disabledFirst === undefined && !('disabledFirst' in $$props || $$self.$$.bound[$$self.$$.props['disabledFirst']])) {
    			console.warn("<Pagination> was created without expected prop 'disabledFirst'");
    		}

    		if (setPage === undefined && !('setPage' in $$props || $$self.$$.bound[$$self.$$.props['setPage']])) {
    			console.warn("<Pagination> was created without expected prop 'setPage'");
    		}
    	});

    	const writable_props = ['totalPages', 'page', 'disabledLast', 'disabledFirst', 'setPage'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Pagination> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setPage(page - 1);
    	const click_handler_1 = i => setPage(i);
    	const click_handler_2 = () => setPage(page + 1);

    	$$self.$$set = $$props => {
    		if ('totalPages' in $$props) $$invalidate(0, totalPages = $$props.totalPages);
    		if ('page' in $$props) $$invalidate(1, page = $$props.page);
    		if ('disabledLast' in $$props) $$invalidate(2, disabledLast = $$props.disabledLast);
    		if ('disabledFirst' in $$props) $$invalidate(3, disabledFirst = $$props.disabledFirst);
    		if ('setPage' in $$props) $$invalidate(4, setPage = $$props.setPage);
    	};

    	$$self.$capture_state = () => ({
    		totalPages,
    		page,
    		disabledLast,
    		disabledFirst,
    		setPage,
    		isVisible
    	});

    	$$self.$inject_state = $$props => {
    		if ('totalPages' in $$props) $$invalidate(0, totalPages = $$props.totalPages);
    		if ('page' in $$props) $$invalidate(1, page = $$props.page);
    		if ('disabledLast' in $$props) $$invalidate(2, disabledLast = $$props.disabledLast);
    		if ('disabledFirst' in $$props) $$invalidate(3, disabledFirst = $$props.disabledFirst);
    		if ('setPage' in $$props) $$invalidate(4, setPage = $$props.setPage);
    		if ('isVisible' in $$props) $$invalidate(5, isVisible = $$props.isVisible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*totalPages*/ 1) {
    			$$invalidate(5, isVisible = totalPages.length == 0 ? 'd-none' : '');
    		}
    	};

    	return [
    		totalPages,
    		page,
    		disabledLast,
    		disabledFirst,
    		setPage,
    		isVisible,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Pagination extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			totalPages: 0,
    			page: 1,
    			disabledLast: 2,
    			disabledFirst: 3,
    			setPage: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pagination",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get totalPages() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set totalPages(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get page() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set page(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabledLast() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabledLast(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabledFirst() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabledFirst(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setPage() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setPage(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Not-Found.svelte generated by Svelte v3.55.1 */

    const file$4 = "src\\components\\Not-Found.svelte";

    function create_fragment$4(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Ooops... No se encontraron productos";
    			attr_dev(p, "class", "text-muted");
    			add_location(p, file$4, 8, 7, 219);
    			attr_dev(div0, "class", "d-flex justify-content-center");
    			add_location(div0, file$4, 7, 4, 167);
    			attr_dev(div1, "class", div1_class_value = "col-12 " + (!/*isEmptyList*/ ctx[0] ? 'd-none' : ''));
    			add_location(div1, file$4, 6, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*isEmptyList*/ 1 && div1_class_value !== (div1_class_value = "col-12 " + (!/*isEmptyList*/ ctx[0] ? 'd-none' : ''))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let isEmptyList;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Not_Found', slots, []);
    	let { currentPageRows } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (currentPageRows === undefined && !('currentPageRows' in $$props || $$self.$$.bound[$$self.$$.props['currentPageRows']])) {
    			console.warn("<Not_Found> was created without expected prop 'currentPageRows'");
    		}
    	});

    	const writable_props = ['currentPageRows'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Not_Found> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('currentPageRows' in $$props) $$invalidate(1, currentPageRows = $$props.currentPageRows);
    	};

    	$$self.$capture_state = () => ({ currentPageRows, isEmptyList });

    	$$self.$inject_state = $$props => {
    		if ('currentPageRows' in $$props) $$invalidate(1, currentPageRows = $$props.currentPageRows);
    		if ('isEmptyList' in $$props) $$invalidate(0, isEmptyList = $$props.isEmptyList);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentPageRows*/ 2) {
    			$$invalidate(0, isEmptyList = currentPageRows.length == 0);
    		}
    	};

    	return [isEmptyList, currentPageRows];
    }

    class Not_Found extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { currentPageRows: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Not_Found",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get currentPageRows() {
    		throw new Error("<Not_Found>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentPageRows(value) {
    		throw new Error("<Not_Found>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Input-List.svelte generated by Svelte v3.55.1 */

    const file$3 = "src\\components\\Input-List.svelte";

    function create_fragment$3(ctx) {
    	let div8;
    	let div0;
    	let h5;
    	let t1;
    	let button;
    	let i;
    	let t2;
    	let div7;
    	let div6;
    	let div5;
    	let ol;
    	let li0;
    	let div2;
    	let div1;
    	let t4;
    	let t5;
    	let span0;
    	let t7;
    	let li1;
    	let div4;
    	let div3;
    	let t9;
    	let t10;
    	let span1;

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Entradas de inventario";
    			t1 = space();
    			button = element("button");
    			i = element("i");
    			t2 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			ol = element("ol");
    			li0 = element("li");
    			div2 = element("div");
    			div1 = element("div");
    			div1.textContent = "Subheading";
    			t4 = text("\r\n              Content for list item");
    			t5 = space();
    			span0 = element("span");
    			span0.textContent = "14";
    			t7 = space();
    			li1 = element("li");
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "Subheading";
    			t9 = text("\r\n              Content for list item");
    			t10 = space();
    			span1 = element("span");
    			span1.textContent = "14";
    			attr_dev(h5, "class", "offcanvas-title text-white text-center");
    			add_location(h5, file$3, 7, 4, 152);
    			attr_dev(i, "class", "bi bi-x-lg");
    			add_location(i, file$3, 17, 25, 519);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			set_style(button, "color", "#ffffff");
    			set_style(button, "border-radius", "100%");
    			set_style(button, "width", "40px");
    			set_style(button, "height", "40px");
    			set_style(button, "background", "#1c1f25", 1);
    			set_style(button, "border-color", "#1c1f25");
    			attr_dev(button, "data-bs-dismiss", "offcanvas");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$3, 10, 4, 250);
    			attr_dev(div0, "class", "offcanvas-header");
    			add_location(div0, file$3, 6, 2, 116);
    			attr_dev(div1, "class", "fw-bold");
    			add_location(div1, file$3, 28, 14, 915);
    			attr_dev(div2, "class", "ms-2 me-auto");
    			add_location(div2, file$3, 27, 12, 873);
    			attr_dev(span0, "class", "badge bg-primary rounded-pill");
    			add_location(span0, file$3, 31, 12, 1023);
    			attr_dev(li0, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li0, file$3, 24, 10, 757);
    			attr_dev(div3, "class", "fw-bold");
    			add_location(div3, file$3, 37, 14, 1263);
    			attr_dev(div4, "class", "ms-2 me-auto");
    			add_location(div4, file$3, 36, 12, 1221);
    			attr_dev(span1, "class", "badge bg-primary rounded-pill");
    			add_location(span1, file$3, 40, 12, 1371);
    			attr_dev(li1, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li1, file$3, 33, 10, 1105);
    			attr_dev(ol, "class", "list-group list-group-numbered");
    			add_location(ol, file$3, 23, 8, 702);
    			attr_dev(div5, "class", "col-6");
    			add_location(div5, file$3, 22, 6, 673);
    			attr_dev(div6, "class", "container d-flex justify-content-center");
    			add_location(div6, file$3, 21, 4, 612);
    			attr_dev(div7, "class", "offcanvas-body small");
    			add_location(div7, file$3, 20, 2, 572);
    			attr_dev(div8, "class", "offcanvas offcanvas-bottom");
    			attr_dev(div8, "tabindex", "-1");
    			attr_dev(div8, "id", "offcanvasInputs");
    			set_style(div8, "height", "100vh");
    			add_location(div8, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, ol);
    			append_dev(ol, li0);
    			append_dev(li0, div2);
    			append_dev(div2, div1);
    			append_dev(div2, t4);
    			append_dev(li0, t5);
    			append_dev(li0, span0);
    			append_dev(ol, t7);
    			append_dev(ol, li1);
    			append_dev(li1, div4);
    			append_dev(div4, div3);
    			append_dev(div4, t9);
    			append_dev(li1, t10);
    			append_dev(li1, span1);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Input_List', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Input_List> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Input_List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input_List",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Output-List.svelte generated by Svelte v3.55.1 */

    const file$2 = "src\\components\\Output-List.svelte";

    function create_fragment$2(ctx) {
    	let div14;
    	let div0;
    	let h5;
    	let t1;
    	let button;
    	let i;
    	let t2;
    	let div13;
    	let div12;
    	let div11;
    	let ol;
    	let li0;
    	let div2;
    	let div1;
    	let t4;
    	let t5;
    	let span0;
    	let t7;
    	let li1;
    	let div4;
    	let div3;
    	let t9;
    	let t10;
    	let span1;
    	let t12;
    	let li2;
    	let div6;
    	let div5;
    	let t14;
    	let t15;
    	let span2;
    	let t17;
    	let li3;
    	let div8;
    	let div7;
    	let t19;
    	let t20;
    	let span3;
    	let t22;
    	let li4;
    	let div10;
    	let div9;
    	let t24;
    	let t25;
    	let span4;

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Salidas de inventario";
    			t1 = space();
    			button = element("button");
    			i = element("i");
    			t2 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			ol = element("ol");
    			li0 = element("li");
    			div2 = element("div");
    			div1 = element("div");
    			div1.textContent = "Subheading";
    			t4 = text("\r\n              Content for list item");
    			t5 = space();
    			span0 = element("span");
    			span0.textContent = "14";
    			t7 = space();
    			li1 = element("li");
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "Subheading";
    			t9 = text("\r\n              Content for list item");
    			t10 = space();
    			span1 = element("span");
    			span1.textContent = "14";
    			t12 = space();
    			li2 = element("li");
    			div6 = element("div");
    			div5 = element("div");
    			div5.textContent = "Subheading";
    			t14 = text("\r\n              Content for list item");
    			t15 = space();
    			span2 = element("span");
    			span2.textContent = "14";
    			t17 = space();
    			li3 = element("li");
    			div8 = element("div");
    			div7 = element("div");
    			div7.textContent = "Subheading";
    			t19 = text("\r\n              Content for list item");
    			t20 = space();
    			span3 = element("span");
    			span3.textContent = "14";
    			t22 = space();
    			li4 = element("li");
    			div10 = element("div");
    			div9 = element("div");
    			div9.textContent = "Subheading";
    			t24 = text("\r\n              Content for list item");
    			t25 = space();
    			span4 = element("span");
    			span4.textContent = "14";
    			attr_dev(h5, "class", "offcanvas-title text-white");
    			add_location(h5, file$2, 7, 4, 153);
    			attr_dev(i, "class", "bi bi-x-lg");
    			add_location(i, file$2, 15, 25, 489);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			set_style(button, "color", "#ffffff");
    			set_style(button, "border-radius", "100%");
    			set_style(button, "width", "40px");
    			set_style(button, "height", "40px");
    			set_style(button, "background", "#1c1f25", 1);
    			set_style(button, "border-color", "#1c1f25");
    			attr_dev(button, "data-bs-dismiss", "offcanvas");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$2, 8, 4, 224);
    			attr_dev(div0, "class", "offcanvas-header");
    			add_location(div0, file$2, 6, 2, 117);
    			attr_dev(div1, "class", "fw-bold");
    			add_location(div1, file$2, 26, 14, 885);
    			attr_dev(div2, "class", "ms-2 me-auto");
    			add_location(div2, file$2, 25, 12, 843);
    			attr_dev(span0, "class", "badge bg-primary rounded-pill");
    			add_location(span0, file$2, 29, 12, 993);
    			attr_dev(li0, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li0, file$2, 22, 10, 727);
    			attr_dev(div3, "class", "fw-bold");
    			add_location(div3, file$2, 35, 14, 1233);
    			attr_dev(div4, "class", "ms-2 me-auto");
    			add_location(div4, file$2, 34, 12, 1191);
    			attr_dev(span1, "class", "badge bg-primary rounded-pill");
    			add_location(span1, file$2, 38, 12, 1341);
    			attr_dev(li1, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li1, file$2, 31, 10, 1075);
    			attr_dev(div5, "class", "fw-bold");
    			add_location(div5, file$2, 44, 14, 1581);
    			attr_dev(div6, "class", "ms-2 me-auto");
    			add_location(div6, file$2, 43, 12, 1539);
    			attr_dev(span2, "class", "badge bg-primary rounded-pill");
    			add_location(span2, file$2, 47, 12, 1689);
    			attr_dev(li2, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li2, file$2, 40, 10, 1423);
    			attr_dev(div7, "class", "fw-bold");
    			add_location(div7, file$2, 53, 14, 1929);
    			attr_dev(div8, "class", "ms-2 me-auto");
    			add_location(div8, file$2, 52, 12, 1887);
    			attr_dev(span3, "class", "badge bg-primary rounded-pill");
    			add_location(span3, file$2, 56, 12, 2037);
    			attr_dev(li3, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li3, file$2, 49, 10, 1771);
    			attr_dev(div9, "class", "fw-bold");
    			add_location(div9, file$2, 62, 14, 2277);
    			attr_dev(div10, "class", "ms-2 me-auto");
    			add_location(div10, file$2, 61, 12, 2235);
    			attr_dev(span4, "class", "badge bg-primary rounded-pill");
    			add_location(span4, file$2, 65, 12, 2385);
    			attr_dev(li4, "class", "list-group-item d-flex justify-content-between align-items-start");
    			add_location(li4, file$2, 58, 10, 2119);
    			attr_dev(ol, "class", "list-group list-group-numbered");
    			add_location(ol, file$2, 21, 8, 672);
    			attr_dev(div11, "class", "col-6");
    			add_location(div11, file$2, 20, 6, 643);
    			attr_dev(div12, "class", "container d-flex justify-content-center");
    			add_location(div12, file$2, 19, 4, 582);
    			attr_dev(div13, "class", "offcanvas-body small");
    			add_location(div13, file$2, 18, 2, 542);
    			attr_dev(div14, "class", "offcanvas offcanvas-bottom");
    			attr_dev(div14, "tabindex", "-1");
    			attr_dev(div14, "id", "offcanvasOutputs");
    			set_style(div14, "height", "100vh");
    			add_location(div14, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div14, t2);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, ol);
    			append_dev(ol, li0);
    			append_dev(li0, div2);
    			append_dev(div2, div1);
    			append_dev(div2, t4);
    			append_dev(li0, t5);
    			append_dev(li0, span0);
    			append_dev(ol, t7);
    			append_dev(ol, li1);
    			append_dev(li1, div4);
    			append_dev(div4, div3);
    			append_dev(div4, t9);
    			append_dev(li1, t10);
    			append_dev(li1, span1);
    			append_dev(ol, t12);
    			append_dev(ol, li2);
    			append_dev(li2, div6);
    			append_dev(div6, div5);
    			append_dev(div6, t14);
    			append_dev(li2, t15);
    			append_dev(li2, span2);
    			append_dev(ol, t17);
    			append_dev(ol, li3);
    			append_dev(li3, div8);
    			append_dev(div8, div7);
    			append_dev(div8, t19);
    			append_dev(li3, t20);
    			append_dev(li3, span3);
    			append_dev(ol, t22);
    			append_dev(ol, li4);
    			append_dev(li4, div10);
    			append_dev(div10, div9);
    			append_dev(div10, t24);
    			append_dev(li4, t25);
    			append_dev(li4, span4);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Output_List', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Output_List> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Output_List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Output_List",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\datatable.svelte generated by Svelte v3.55.1 */
    const file$1 = "src\\components\\datatable.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t7;
    	let tbody;
    	let tr1;
    	let td0;
    	let t9;
    	let td1;
    	let t11;
    	let td2;
    	let t13;
    	let td3;
    	let t15;
    	let tr2;
    	let td4;
    	let t17;
    	let td5;
    	let t19;
    	let td6;
    	let t21;
    	let td7;
    	let t23;
    	let tr3;
    	let td8;
    	let t25;
    	let td9;
    	let t27;
    	let td10;
    	let t29;
    	let td11;
    	let t31;
    	let tr4;
    	let td12;
    	let t33;
    	let td13;
    	let t35;
    	let td14;
    	let t37;
    	let td15;
    	let t39;
    	let tr5;
    	let td16;
    	let t41;
    	let td17;
    	let t43;
    	let td18;
    	let t45;
    	let td19;
    	let t47;
    	let tr6;
    	let td20;
    	let t49;
    	let td21;
    	let t51;
    	let td22;
    	let t53;
    	let td23;
    	let t55;
    	let tr7;
    	let td24;
    	let t57;
    	let td25;
    	let t59;
    	let td26;
    	let t61;
    	let td27;
    	let t63;
    	let tr8;
    	let td28;
    	let t65;
    	let td29;
    	let t67;
    	let td30;
    	let t69;
    	let td31;
    	let t71;
    	let tr9;
    	let td32;
    	let t73;
    	let td33;
    	let t75;
    	let td34;
    	let t77;
    	let td35;

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "#";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "First";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Last";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "Handle";
    			t7 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "1";
    			t9 = space();
    			td1 = element("td");
    			td1.textContent = "Mark";
    			t11 = space();
    			td2 = element("td");
    			td2.textContent = "Otto";
    			t13 = space();
    			td3 = element("td");
    			td3.textContent = "@mdo";
    			t15 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "1";
    			t17 = space();
    			td5 = element("td");
    			td5.textContent = "Mark";
    			t19 = space();
    			td6 = element("td");
    			td6.textContent = "Otto";
    			t21 = space();
    			td7 = element("td");
    			td7.textContent = "@mdo";
    			t23 = space();
    			tr3 = element("tr");
    			td8 = element("td");
    			td8.textContent = "1";
    			t25 = space();
    			td9 = element("td");
    			td9.textContent = "Mark";
    			t27 = space();
    			td10 = element("td");
    			td10.textContent = "Otto";
    			t29 = space();
    			td11 = element("td");
    			td11.textContent = "@mdo";
    			t31 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			td12.textContent = "1";
    			t33 = space();
    			td13 = element("td");
    			td13.textContent = "Mark";
    			t35 = space();
    			td14 = element("td");
    			td14.textContent = "Otto";
    			t37 = space();
    			td15 = element("td");
    			td15.textContent = "@mdo";
    			t39 = space();
    			tr5 = element("tr");
    			td16 = element("td");
    			td16.textContent = "1";
    			t41 = space();
    			td17 = element("td");
    			td17.textContent = "Mark";
    			t43 = space();
    			td18 = element("td");
    			td18.textContent = "Otto";
    			t45 = space();
    			td19 = element("td");
    			td19.textContent = "@mdo";
    			t47 = space();
    			tr6 = element("tr");
    			td20 = element("td");
    			td20.textContent = "1";
    			t49 = space();
    			td21 = element("td");
    			td21.textContent = "Mark";
    			t51 = space();
    			td22 = element("td");
    			td22.textContent = "Otto";
    			t53 = space();
    			td23 = element("td");
    			td23.textContent = "@mdo";
    			t55 = space();
    			tr7 = element("tr");
    			td24 = element("td");
    			td24.textContent = "1";
    			t57 = space();
    			td25 = element("td");
    			td25.textContent = "Mark";
    			t59 = space();
    			td26 = element("td");
    			td26.textContent = "Otto";
    			t61 = space();
    			td27 = element("td");
    			td27.textContent = "@mdo";
    			t63 = space();
    			tr8 = element("tr");
    			td28 = element("td");
    			td28.textContent = "1";
    			t65 = space();
    			td29 = element("td");
    			td29.textContent = "Mark";
    			t67 = space();
    			td30 = element("td");
    			td30.textContent = "Otto";
    			t69 = space();
    			td31 = element("td");
    			td31.textContent = "@mdo";
    			t71 = space();
    			tr9 = element("tr");
    			td32 = element("td");
    			td32.textContent = "1";
    			t73 = space();
    			td33 = element("td");
    			td33.textContent = "Mark";
    			t75 = space();
    			td34 = element("td");
    			td34.textContent = "Otto";
    			t77 = space();
    			td35 = element("td");
    			td35.textContent = "@mdo";
    			add_location(th0, file$1, 35, 8, 803);
    			add_location(th1, file$1, 36, 8, 823);
    			add_location(th2, file$1, 37, 8, 847);
    			add_location(th3, file$1, 38, 8, 870);
    			add_location(tr0, file$1, 34, 6, 789);
    			add_location(thead, file$1, 33, 4, 774);
    			add_location(td0, file$1, 43, 8, 947);
    			add_location(td1, file$1, 44, 8, 967);
    			add_location(td2, file$1, 45, 8, 990);
    			add_location(td3, file$1, 46, 8, 1013);
    			add_location(tr1, file$1, 42, 6, 933);
    			add_location(td4, file$1, 49, 8, 1061);
    			add_location(td5, file$1, 50, 8, 1081);
    			add_location(td6, file$1, 51, 8, 1104);
    			add_location(td7, file$1, 52, 8, 1127);
    			add_location(tr2, file$1, 48, 6, 1047);
    			add_location(td8, file$1, 55, 8, 1175);
    			add_location(td9, file$1, 56, 8, 1195);
    			add_location(td10, file$1, 57, 8, 1218);
    			add_location(td11, file$1, 58, 8, 1241);
    			add_location(tr3, file$1, 54, 6, 1161);
    			add_location(td12, file$1, 61, 8, 1289);
    			add_location(td13, file$1, 62, 8, 1309);
    			add_location(td14, file$1, 63, 8, 1332);
    			add_location(td15, file$1, 64, 8, 1355);
    			add_location(tr4, file$1, 60, 6, 1275);
    			add_location(td16, file$1, 67, 8, 1403);
    			add_location(td17, file$1, 68, 8, 1423);
    			add_location(td18, file$1, 69, 8, 1446);
    			add_location(td19, file$1, 70, 8, 1469);
    			add_location(tr5, file$1, 66, 6, 1389);
    			add_location(td20, file$1, 73, 8, 1517);
    			add_location(td21, file$1, 74, 8, 1537);
    			add_location(td22, file$1, 75, 8, 1560);
    			add_location(td23, file$1, 76, 8, 1583);
    			add_location(tr6, file$1, 72, 6, 1503);
    			add_location(td24, file$1, 79, 8, 1631);
    			add_location(td25, file$1, 80, 8, 1651);
    			add_location(td26, file$1, 81, 8, 1674);
    			add_location(td27, file$1, 82, 8, 1697);
    			add_location(tr7, file$1, 78, 6, 1617);
    			add_location(td28, file$1, 85, 8, 1745);
    			add_location(td29, file$1, 86, 8, 1765);
    			add_location(td30, file$1, 87, 8, 1788);
    			add_location(td31, file$1, 88, 8, 1811);
    			add_location(tr8, file$1, 84, 6, 1731);
    			add_location(td32, file$1, 90, 8, 1851);
    			add_location(td33, file$1, 91, 8, 1871);
    			add_location(td34, file$1, 92, 8, 1894);
    			add_location(td35, file$1, 93, 8, 1917);
    			add_location(tr9, file$1, 89, 11, 1837);
    			add_location(tbody, file$1, 41, 4, 918);
    			attr_dev(table, "class", "table table-dark");
    			add_location(table, file$1, 32, 2, 721);
    			add_location(div, file$1, 31, 0, 712);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t1);
    			append_dev(tr0, th1);
    			append_dev(tr0, t3);
    			append_dev(tr0, th2);
    			append_dev(tr0, t5);
    			append_dev(tr0, th3);
    			append_dev(table, t7);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t9);
    			append_dev(tr1, td1);
    			append_dev(tr1, t11);
    			append_dev(tr1, td2);
    			append_dev(tr1, t13);
    			append_dev(tr1, td3);
    			append_dev(tbody, t15);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t17);
    			append_dev(tr2, td5);
    			append_dev(tr2, t19);
    			append_dev(tr2, td6);
    			append_dev(tr2, t21);
    			append_dev(tr2, td7);
    			append_dev(tbody, t23);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td8);
    			append_dev(tr3, t25);
    			append_dev(tr3, td9);
    			append_dev(tr3, t27);
    			append_dev(tr3, td10);
    			append_dev(tr3, t29);
    			append_dev(tr3, td11);
    			append_dev(tbody, t31);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td12);
    			append_dev(tr4, t33);
    			append_dev(tr4, td13);
    			append_dev(tr4, t35);
    			append_dev(tr4, td14);
    			append_dev(tr4, t37);
    			append_dev(tr4, td15);
    			append_dev(tbody, t39);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td16);
    			append_dev(tr5, t41);
    			append_dev(tr5, td17);
    			append_dev(tr5, t43);
    			append_dev(tr5, td18);
    			append_dev(tr5, t45);
    			append_dev(tr5, td19);
    			append_dev(tbody, t47);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td20);
    			append_dev(tr6, t49);
    			append_dev(tr6, td21);
    			append_dev(tr6, t51);
    			append_dev(tr6, td22);
    			append_dev(tr6, t53);
    			append_dev(tr6, td23);
    			append_dev(tbody, t55);
    			append_dev(tbody, tr7);
    			append_dev(tr7, td24);
    			append_dev(tr7, t57);
    			append_dev(tr7, td25);
    			append_dev(tr7, t59);
    			append_dev(tr7, td26);
    			append_dev(tr7, t61);
    			append_dev(tr7, td27);
    			append_dev(tbody, t63);
    			append_dev(tbody, tr8);
    			append_dev(tr8, td28);
    			append_dev(tr8, t65);
    			append_dev(tr8, td29);
    			append_dev(tr8, t67);
    			append_dev(tr8, td30);
    			append_dev(tr8, t69);
    			append_dev(tr8, td31);
    			append_dev(tr8, t71);
    			append_dev(tbody, tr9);
    			append_dev(tr9, td32);
    			append_dev(tr9, t73);
    			append_dev(tr9, td33);
    			append_dev(tr9, t75);
    			append_dev(tr9, td34);
    			append_dev(tr9, t77);
    			append_dev(tr9, td35);
    			/*table_binding*/ ctx[1](table);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*table_binding*/ ctx[1](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Datatable', slots, []);
    	let el;

    	onMount(async () => {
    		await tick();

    		new DataTable(el,
    		{
    				dom: 'B<"clear">lfrtip',
    				language: { url: "./translate.json" },
    				lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "Todo"]],
    				buttons: [
    					{
    						extend: "excel",
    						className: "btn btn-success",
    						text: '<i class="bi bi-file-earmark-excel-fill"></i> Descargar documento',
    						titleArttr: "Exportar a Excel",
    						exportOptions: { modifier: { page: "all" } }
    					}
    				]
    			});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Datatable> was created with unknown prop '${key}'`);
    	});

    	function table_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			el = $$value;
    			$$invalidate(0, el);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, tick, el });

    	$$self.$inject_state = $$props => {
    		if ('el' in $$props) $$invalidate(0, el = $$props.el);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [el, table_binding];
    }

    class Datatable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Datatable",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.55.1 */
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i].id;
    	child_ctx[14] = list[i].name;
    	child_ctx[15] = list[i].stock;
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (80:6) {#each currentPageRows as { id, name, stock }
    function create_each_block(ctx) {
    	let product;
    	let current;

    	product = new Product({
    			props: {
    				id: /*id*/ ctx[13],
    				name: /*name*/ ctx[14],
    				stock: /*stock*/ ctx[15]
    			},
    			$$inline: true
    		});

    	product.$on("updateInventory", /*updateStock*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(product.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(product, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const product_changes = {};
    			if (dirty & /*currentPageRows*/ 4) product_changes.id = /*id*/ ctx[13];
    			if (dirty & /*currentPageRows*/ 4) product_changes.name = /*name*/ ctx[14];
    			if (dirty & /*currentPageRows*/ 4) product_changes.stock = /*stock*/ ctx[15];
    			product.$set(product_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(product, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(80:6) {#each currentPageRows as { id, name, stock }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t0;
    	let div1;
    	let div0;
    	let t1;
    	let notfound;
    	let t2;
    	let pagination;
    	let t3;
    	let addinventory;
    	let t4;
    	let inputlist;
    	let t5;
    	let outputlist;
    	let t6;
    	let datatable;
    	let current;
    	header = new Header({ $$inline: true });
    	header.$on("input", /*searchProduct*/ ctx[6]);
    	let each_value = /*currentPageRows*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	notfound = new Not_Found({
    			props: {
    				currentPageRows: /*currentPageRows*/ ctx[2]
    			},
    			$$inline: true
    		});

    	pagination = new Pagination({
    			props: {
    				page: /*page*/ ctx[0],
    				totalPages: /*totalPages*/ ctx[1],
    				disabledLast: /*disabledLast*/ ctx[5],
    				disabledFirst: /*disabledFirst*/ ctx[4],
    				setPage: /*setPage*/ ctx[7]
    			},
    			$$inline: true
    		});

    	addinventory = new Add_Inventory({
    			props: { productId: /*productId*/ ctx[3] },
    			$$inline: true
    		});

    	inputlist = new Input_List({ $$inline: true });
    	outputlist = new Output_List({ $$inline: true });
    	datatable = new Datatable({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			create_component(notfound.$$.fragment);
    			t2 = space();
    			create_component(pagination.$$.fragment);
    			t3 = space();
    			create_component(addinventory.$$.fragment);
    			t4 = space();
    			create_component(inputlist.$$.fragment);
    			t5 = space();
    			create_component(outputlist.$$.fragment);
    			t6 = space();
    			create_component(datatable.$$.fragment);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file, 78, 4, 2198);
    			attr_dev(div1, "class", "col-12");
    			add_location(div1, file, 77, 2, 2172);
    			attr_dev(main, "class", "container");
    			add_location(main, file, 75, 0, 2105);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			append_dev(main, div1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(main, t1);
    			mount_component(notfound, main, null);
    			append_dev(main, t2);
    			mount_component(pagination, main, null);
    			append_dev(main, t3);
    			mount_component(addinventory, main, null);
    			append_dev(main, t4);
    			mount_component(inputlist, main, null);
    			append_dev(main, t5);
    			mount_component(outputlist, main, null);
    			append_dev(main, t6);
    			mount_component(datatable, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentPageRows, updateStock*/ 260) {
    				each_value = /*currentPageRows*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const notfound_changes = {};
    			if (dirty & /*currentPageRows*/ 4) notfound_changes.currentPageRows = /*currentPageRows*/ ctx[2];
    			notfound.$set(notfound_changes);
    			const pagination_changes = {};
    			if (dirty & /*page*/ 1) pagination_changes.page = /*page*/ ctx[0];
    			if (dirty & /*totalPages*/ 2) pagination_changes.totalPages = /*totalPages*/ ctx[1];
    			if (dirty & /*disabledLast*/ 32) pagination_changes.disabledLast = /*disabledLast*/ ctx[5];
    			if (dirty & /*disabledFirst*/ 16) pagination_changes.disabledFirst = /*disabledFirst*/ ctx[4];
    			pagination.$set(pagination_changes);
    			const addinventory_changes = {};
    			if (dirty & /*productId*/ 8) addinventory_changes.productId = /*productId*/ ctx[3];
    			addinventory.$set(addinventory_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(notfound.$$.fragment, local);
    			transition_in(pagination.$$.fragment, local);
    			transition_in(addinventory.$$.fragment, local);
    			transition_in(inputlist.$$.fragment, local);
    			transition_in(outputlist.$$.fragment, local);
    			transition_in(datatable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(notfound.$$.fragment, local);
    			transition_out(pagination.$$.fragment, local);
    			transition_out(addinventory.$$.fragment, local);
    			transition_out(inputlist.$$.fragment, local);
    			transition_out(outputlist.$$.fragment, local);
    			transition_out(datatable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_each(each_blocks, detaching);
    			destroy_component(notfound);
    			destroy_component(pagination);
    			destroy_component(addinventory);
    			destroy_component(inputlist);
    			destroy_component(outputlist);
    			destroy_component(datatable);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let disabledLast;
    	let disabledFirst;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let currentProducts = [];
    	let filteredProducts = [];
    	let page = 0;
    	let totalPages = [];
    	let currentPageRows = [];
    	let itemsPerPage = 12;
    	let productId = 0;

    	onMount(async () => {
    		currentProducts = await getProducts();
    		filteredProducts = await getProducts();
    		paginate(filteredProducts);
    	});

    	const searchProduct = e => {
    		const word = e.target.value.toLowerCase();

    		if (word == "") {
    			filteredProducts = [...currentProducts];
    			paginate(filteredProducts);
    			return;
    		}

    		const results = currentProducts.filter(({ name }) => name.toLowerCase().indexOf(word) > -1);
    		filteredProducts = [...results];
    		$$invalidate(0, page = 0);
    		$$invalidate(1, totalPages = []);
    		paginate(filteredProducts);
    	};

    	const paginate = items => {
    		const pages = Math.ceil(items.length / itemsPerPage);

    		const paginatedItems = Array.from({ length: pages }, (_, index) => {
    			const start = index * itemsPerPage;
    			return items.slice(start, start + itemsPerPage);
    		});

    		$$invalidate(1, totalPages = [...paginatedItems]);
    	};

    	const setPage = p => {
    		if (p >= 0 && p < totalPages.length) {
    			$$invalidate(0, page = p);
    		}
    	};

    	const updateStock = e => {
    		const { id } = e.detail;
    		$$invalidate(3, productId = id);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Toast,
    		onMount,
    		getProducts,
    		Header,
    		Product,
    		AddInventory: Add_Inventory,
    		Pagination,
    		NotFound: Not_Found,
    		InputList: Input_List,
    		OutputList: Output_List,
    		Datatable,
    		currentProducts,
    		filteredProducts,
    		page,
    		totalPages,
    		currentPageRows,
    		itemsPerPage,
    		productId,
    		searchProduct,
    		paginate,
    		setPage,
    		updateStock,
    		disabledFirst,
    		disabledLast
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentProducts' in $$props) currentProducts = $$props.currentProducts;
    		if ('filteredProducts' in $$props) filteredProducts = $$props.filteredProducts;
    		if ('page' in $$props) $$invalidate(0, page = $$props.page);
    		if ('totalPages' in $$props) $$invalidate(1, totalPages = $$props.totalPages);
    		if ('currentPageRows' in $$props) $$invalidate(2, currentPageRows = $$props.currentPageRows);
    		if ('itemsPerPage' in $$props) itemsPerPage = $$props.itemsPerPage;
    		if ('productId' in $$props) $$invalidate(3, productId = $$props.productId);
    		if ('disabledFirst' in $$props) $$invalidate(4, disabledFirst = $$props.disabledFirst);
    		if ('disabledLast' in $$props) $$invalidate(5, disabledLast = $$props.disabledLast);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*totalPages, page*/ 3) {
    			$$invalidate(2, currentPageRows = totalPages.length > 0 ? totalPages[page] : []);
    		}

    		if ($$self.$$.dirty & /*page, totalPages*/ 3) {
    			$$invalidate(5, disabledLast = page + 1 == totalPages.length ? "disabled" : "");
    		}

    		if ($$self.$$.dirty & /*page*/ 1) {
    			$$invalidate(4, disabledFirst = page + 1 == 1 ? "disabled" : "");
    		}
    	};

    	return [
    		page,
    		totalPages,
    		currentPageRows,
    		productId,
    		disabledFirst,
    		disabledLast,
    		searchProduct,
    		setPage,
    		updateStock
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
