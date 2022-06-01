const sharedConfig = {};
function setHydrateContext(context) {
  sharedConfig.context = context;
}

const equalFn = (a, b) => a === b;
const $TRACK = Symbol("solid-track");
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const NOTPENDING = {};
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var Owner = null;
let Transition = null;
let Listener = null;
let Pending = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener,
        owner = Owner,
        root = fn.length === 0 && !false ? UNOWNED : {
    owned: null,
    cleanups: null,
    context: null,
    owner: detachedOwner || owner
  };
  Owner = root;
  Listener = null;
  try {
    return runUpdates(() => fn(() => cleanNode(root)), true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    pending: NOTPENDING,
    comparator: options.equals || undefined
  };
  const setter = value => {
    if (typeof value === "function") {
      value = value(s.pending !== NOTPENDING ? s.pending : s.value);
    }
    return writeSignal(s, value);
  };
  return [readSignal.bind(s), setter];
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE);
  c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.pending = NOTPENDING;
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || undefined;
  updateComputation(c);
  return readSignal.bind(c);
}
function batch(fn) {
  if (Pending) return fn();
  let result;
  const q = Pending = [];
  try {
    result = fn();
  } finally {
    Pending = null;
  }
  runUpdates(() => {
    for (let i = 0; i < q.length; i += 1) {
      const data = q[i];
      if (data.pending !== NOTPENDING) {
        const pending = data.pending;
        data.pending = NOTPENDING;
        writeSignal(data, pending);
      }
    }
  }, false);
  return result;
}
function untrack(fn) {
  let result,
      listener = Listener;
  Listener = null;
  result = fn();
  Listener = listener;
  return result;
}
function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  let defer = options && options.defer;
  return prevValue => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++) input[i] = deps[i]();
    } else input = deps();
    if (defer) {
      defer = false;
      return undefined;
    }
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onCleanup(fn) {
  if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
  return fn;
}
function getOwner() {
  return Owner;
}
function readSignal() {
  const runningTransition = Transition ;
  if (this.sources && (this.state || runningTransition )) {
    const updates = Updates;
    Updates = null;
    this.state === STALE || runningTransition  ? updateComputation(this) : lookUpstream(this);
    Updates = updates;
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  if (Pending) {
    if (node.pending === NOTPENDING) Pending.push(node);
    node.pending = value;
    return value;
  }
  if (node.comparator) {
    if (node.comparator(node.value, value)) return value;
  }
  let TransitionRunning = false;
  node.value = value;
  if (node.observers && node.observers.length) {
    runUpdates(() => {
      for (let i = 0; i < node.observers.length; i += 1) {
        const o = node.observers[i];
        if (TransitionRunning && Transition.disposed.has(o)) ;
        if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
          if (o.pure) Updates.push(o);else Effects.push(o);
          if (o.observers) markDownstream(o);
        }
        if (TransitionRunning) ;else o.state = STALE;
      }
      if (Updates.length > 10e5) {
        Updates = [];
        if (false) ;
        throw new Error();
      }
    }, false);
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const owner = Owner,
        listener = Listener,
        time = ExecCount;
  Listener = Owner = node;
  runComputation(node, node.value, time);
  Listener = listener;
  Owner = owner;
}
function runComputation(node, value, time) {
  let nextValue;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    handleError(err);
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.observers && node.observers.length) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state, options) {
  const c = {
    fn,
    state: state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: null,
    pure
  };
  if (Owner === null) ;else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
    }
  }
  return c;
}
function runTop(node) {
  const runningTransition = Transition ;
  if (node.state === 0 || runningTransition ) return;
  if (node.state === PENDING || runningTransition ) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state || runningTransition ) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (node.state === STALE || runningTransition ) {
      updateComputation(node);
    } else if (node.state === PENDING || runningTransition ) {
      const updates = Updates;
      Updates = null;
      lookUpstream(node, ancestors[0]);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    handleError(err);
  } finally {
    Updates = null;
    if (!wait) Effects = null;
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  if (Effects.length) batch(() => {
    runEffects(Effects);
    Effects = null;
  });else {
    Effects = null;
  }
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function runUserEffects(queue) {
  let i,
      userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user) runTop(e);else queue[userLength++] = e;
  }
  if (sharedConfig.context) setHydrateContext();
  const resume = queue.length;
  for (i = 0; i < userLength; i++) runTop(queue[i]);
  for (i = resume; i < queue.length; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  const runningTransition = Transition ;
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      if (source.state === STALE || runningTransition ) {
        if (source !== ignore) runTop(source);
      } else if (source.state === PENDING || runningTransition ) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  const runningTransition = Transition ;
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state || runningTransition ) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
            index = node.sourceSlots.pop(),
            obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(),
              s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.owned) {
    for (i = 0; i < node.owned.length; i++) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = 0; i < node.cleanups.length; i++) node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
  node.context = null;
}
function handleError(err) {
  throw err;
}

const FALLBACK = Symbol("fallback");
function dispose(d) {
  for (let i = 0; i < d.length; i++) d[i]();
}
function mapArray(list, mapFn, options = {}) {
  let items = [],
      mapped = [],
      disposers = [],
      len = 0,
      indexes = mapFn.length > 1 ? [] : null;
  onCleanup(() => dispose(disposers));
  return () => {
    let newItems = list() || [],
        i,
        j;
    newItems[$TRACK];
    return untrack(() => {
      let newLen = newItems.length,
          newIndices,
          newIndicesNext,
          temp,
          tempdisposers,
          tempIndexes,
          start,
          end,
          newEnd,
          item;
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          indexes && (indexes = []);
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot(disposer => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
      }
      else if (len === 0) {
        mapped = new Array(newLen);
        for (j = 0; j < newLen; j++) {
          items[j] = newItems[j];
          mapped[j] = createRoot(mapper);
        }
        len = newLen;
      } else {
        temp = new Array(newLen);
        tempdisposers = new Array(newLen);
        indexes && (tempIndexes = new Array(newLen));
        for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
        for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          indexes && (tempIndexes[newEnd] = indexes[end]);
        }
        newIndices = new Map();
        newIndicesNext = new Array(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = newItems[j];
          i = newIndices.get(item);
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(item, j);
        }
        for (i = start; i <= end; i++) {
          item = items[i];
          j = newIndices.get(item);
          if (j !== undefined && j !== -1) {
            temp[j] = mapped[i];
            tempdisposers[j] = disposers[i];
            indexes && (tempIndexes[j] = indexes[i]);
            j = newIndicesNext[j];
            newIndices.set(item, j);
          } else disposers[i]();
        }
        for (j = start; j < newLen; j++) {
          if (j in temp) {
            mapped[j] = temp[j];
            disposers[j] = tempdisposers[j];
            if (indexes) {
              indexes[j] = tempIndexes[j];
              indexes[j](j);
            }
          } else mapped[j] = createRoot(mapper);
        }
        mapped = mapped.slice(0, len = newLen);
        items = newItems.slice(0);
      }
      return mapped;
    });
    function mapper(disposer) {
      disposers[j] = disposer;
      if (indexes) {
        const [s, set] = createSignal(j);
        indexes[j] = set;
        return mapFn(newItems[j], s);
      }
      return mapFn(newItems[j]);
    }
  };
}
function createComponent(Comp, props) {
  return untrack(() => Comp(props || {}));
}

function For(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(mapArray(() => props.each, props.children, fallback ? fallback : undefined));
}
function Show(props) {
  let strictEqual = false;
  const condition = createMemo(() => props.when, undefined, {
    equals: (a, b) => strictEqual ? a === b : !a === !b
  });
  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      return (strictEqual = typeof child === "function" && child.length > 0) ? untrack(() => child(c)) : child;
    }
    return props.fallback;
  });
}

function reconcileArrays(parentNode, a, b) {
  let bLength = b.length,
      aEnd = a.length,
      bEnd = bLength,
      aStart = 0,
      bStart = 0,
      after = a[aEnd - 1].nextSibling,
      map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
              sequence = 1,
              t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}

const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
  });
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  let node = t.content.firstChild;
  if (isSVG) node = node.firstChild;
  return node;
}
function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
function className(node, value) {
  if (value == null) node.removeAttribute("class");else node.className = value;
}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}
function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = e.composedPath && e.composedPath()[0] || e.target;
  if (e.target !== node) {
    Object.defineProperty(e, "target", {
      configurable: true,
      value: node
    });
  }
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (sharedConfig.registry && !sharedConfig.done) {
    sharedConfig.done = true;
    document.querySelectorAll("[id^=pl-]").forEach(elem => elem.remove());
  }
  while (node !== null) {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler(data, e) : handler(e);
      if (e.cancelBubble) return;
    }
    node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
  }
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  if (sharedConfig.context && !current) current = [...parent.childNodes];
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
        multi = marker !== undefined;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === "string" || t === "number") {
    if (sharedConfig.context) return current;
    if (t === "number") value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (sharedConfig.context) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    if (normalizeIncomingArray(array, value, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (sharedConfig.context) {
      for (let i = 0; i < array.length; i++) {
        if (array[i].parentNode) return current = array;
      }
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else if (Array.isArray(current)) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value instanceof Node) {
    if (sharedConfig.context && value.parentNode) return current = multi ? [value] : value;
    if (Array.isArray(current)) {
      if (multi) return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else ;
  return current;
}
function normalizeIncomingArray(normalized, array, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
        t;
    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item) || dynamic;
    } else if ((t = typeof item) === "string") {
      normalized.push(document.createTextNode(item));
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else normalized.push(document.createTextNode(item.toString()));
  }
  return dynamic;
}
function appendNodes(parent, array, marker) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}

class Vec2 {
  static from_angle = n => new Vec2(Math.cos(n), Math.sin(n));
  static make = (x, y) => new Vec2(x, y);

  static get unit() {
    return new Vec2(1, 1);
  }

  static get zero() {
    return new Vec2(0, 0);
  }

  get vs() {
    return [this.x, this.y];
  }

  get mul_inverse() {
    return new Vec2(1 / this.x, 1 / this.y);
  }

  get inverse() {
    return new Vec2(-this.x, -this.y);
  }

  get half() {
    return new Vec2(this.x / 2, this.y / 2);
  }

  get length_squared() {
    return this.x * this.x + this.y * this.y;
  }

  get length() {
    return Math.sqrt(this.length_squared);
  }

  get normalize() {
    if (this.length === 0) {
      return Vec2.zero;
    }

    return this.scale(1 / this.length);
  }

  get perpendicular() {
    return new Vec2(-this.y, this.x);
  }

  get clone() {
    return new Vec2(this.x, this.y);
  }

  get angle() {
    return Math.atan2(this.y, this.x);
  }

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  project_to(v) {
    let lsq = v.length_squared;
    let dp = this.dot(v);
    return Vec2.make(dp * v.x / lsq, dp * v.y / lsq);
  }

  distance(v) {
    return this.sub(v).length;
  }

  addy(n) {
    return Vec2.make(this.x, this.y + n);
  }

  add_angle(n) {
    return Vec2.from_angle(this.angle + n);
  }

  scale(n) {
    let {
      clone
    } = this;
    return clone.scale_in(n);
  }

  scale_in(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  add(v) {
    let {
      clone
    } = this;
    return clone.add_in(v);
  }

  add_in(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    let {
      clone
    } = this;
    return clone.sub_in(v);
  }

  sub_in(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(v) {
    let {
      clone
    } = this;
    return clone.mul_in(v);
  }

  mul_in(v) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }

  div(v) {
    let {
      clone
    } = this;
    return clone.div_in(v);
  }

  div_in(v) {
    this.x /= v.x;
    this.y /= v.y;
    return this;
  }

  set_in(x, y = this.y) {
    this.x = x;
    this.y = y;
    return this;
  }

}

function owrite(signal, fn) {
  if (typeof fn === 'function') {
    return signal[1](fn);
  } else {
    signal[1](_ => fn);
  }
}
function write(signal, fn) {
  return signal[1](_ => {
    fn(_);
    return _;
  });
}
function read(signal) {
  if (Array.isArray(signal)) {
    return signal[0]();
  } else {
    return signal();
  }
}

function make_array(arr, map) {
  let _arr = createSignal(arr, {
    equals: false
  });

  let _ = createMemo(mapArray(_arr[0], map));

  return {
    get values() {
      return _();
    },

    get head() {
      return _()[0];
    },

    push(a) {
      write(_arr, _ => _.push(a));
    },

    pop() {
      let res;
      write(_arr, _ => res = _.pop());
      return res;
    },

    enqueue(a) {
      write(_arr, _ => _.unshift(a));
    },

    dequeue() {
      let res;
      write(_arr, _ => res = _.shift());
      return res;
    },

    remove(a) {
      write(_arr, _ => {
        _.splice(_.indexOf(a), 1);
      });
    },

    clear() {
      owrite(_arr, []);
    }

  };
}

const make_id_gen = () => {
  let id = 0;
  return () => ++id;
};

const id_gen = make_id_gen();
function make_position(x, y) {
  let _x = createSignal(x, {
    equals: false
  });

  let _y = createSignal(y, {
    equals: false
  });

  let m_p = createMemo(() => point(read(_x), read(_y)));
  let m_vs = createMemo(() => Vec2.make(read(_x), read(_y)));
  return {
    get point() {
      return m_p();
    },

    get x() {
      return read(_x);
    },

    set x(v) {
      owrite(_x, v);
    },

    get y() {
      return read(_y);
    },

    set y(v) {
      owrite(_y, v);
    },

    set vs(vs) {
      batch(() => {
        owrite(_x, _ => lerp(_, vs.x)), owrite(_y, _ => lerp(_, vs.y));
      });
    },

    get vs() {
      return m_vs();
    },

    get clone() {
      return make_position(read(_x), read(_y));
    }

  };
}
function point(x, y) {
  return `${x} ${y} ${id_gen()}`;
}
point(0, 0);

const key_motion = ['h', 'j', 'k', 'l', 'b', 'w', 'e', '$', '0'];

function indexes_between(n, m) {
  let res = [];

  for (let i = n; i <= m; i++) {
    res.push(i);
  }

  return res;
}

function out_of_ctx(p, n, no_spaces) {
  let RE = no_spaces ? /[a-zA-Z0-9]/ : /[a-zA-Z0-9 ]/;
  let w = !!p.match(/[a-zA-Z0-9]/),
      wn = !!n.match(RE);
  return w !== wn;
} // TODO cache


function wordize(line, no_spaces = false) {
  let res = [];
  let ctx = '';

  for (let i = 0; i < line.length - 1; i++) {
    ctx += line[i];

    if (out_of_ctx(line[i], line[i + 1], no_spaces)) {
      res.push(ctx);
      ctx = '';
    }
  }

  ctx += line[line.length - 1];

  if (ctx !== '') {
    res.push(ctx);
  }

  return res;
}

function words_n(words, n) {
  let res = 0;

  for (let i = 0; i < words.length; i++) {
    res += words[i].length;

    if (res - 1 >= n) {
      return i;
    }
  }
}

function words_count(words, n) {
  let res = 0;

  for (let i = 0; i <= n; i++) {
    res += words[i].length;
  }

  return res;
}

function beginning_of_word0(line) {
  return line.length - line.trim().length;
}

function beginning_of_word(line, n) {
  let wz = wordize(line);
  let i = words_n(wz, n);
  return words_count(wz, i - 1);
}

function end_of_word(line, n) {
  let wz = wordize(line, true);
  let i = words_n(wz, n);
  return words_count(wz, i) - 1;
}

function start_of_next_word(line, n) {
  let wz = wordize(line);
  let i = words_n(wz, n);
  return words_count(wz, i);
}

class Pen {
  get mode() {
    return read(this._mode);
  }

  set mode(m) {
    return owrite(this._mode, m);
  }

  set $content_ref(ref) {
    owrite(this._$content_ref, ref);
  }

  set $cursor_ref(ref) {
    owrite(this._$cursor_ref, ref);
  }

  get content() {
    return this.lines.content;
  }

  set content(content) {
    this.lines.content = content;
  }

  line_klasses(i) {
    return this.lines.line_klasses(i);
  }

  onScroll() {
    owrite(this._$clear_bounds);
  }

  get prompt() {
    return read(this._prompt);
  }

  set prompt(prompt) {
    owrite(this._prompt, prompt);
  }

  constructor(content, on_command) {
    this.on_command = on_command;
    this._prompt = createSignal();
    this._$clear_bounds = createSignal(undefined, {
      equals: false
    });
    this._$content_ref = createSignal(undefined, {
      equals: false
    });
    this._$cursor_ref = createSignal(undefined, {
      equals: false
    });
    this._mode = createSignal(1);
    this.lines = make_lines(this, content);
    this.empty_lines = createMemo(() => {
      let nb = this.lines.lines.length;

      if (nb >= 80) {
        return [];
      }

      return [...Array(80 - nb).keys()];
    });
    this.m_content_rect = createMemo(() => {
      read(this._$clear_bounds);
      return read(this._$content_ref)?.getBoundingClientRect();
    });
    this.m_cursor_rect = createMemo(() => {
      read(this._$clear_bounds);
      return read(this._$cursor_ref)?.getBoundingClientRect();
    });
    this.nb_lines = createMemo(() => {
      let content_rect = this.m_content_rect(),
          cursor_rect = this.m_cursor_rect();

      if (content_rect && cursor_rect) {
        return Math.floor(content_rect.height / cursor_rect.height);
      }

      return 0;
    });

    this.m_top_off = () => {
      let content_rect = this.m_content_rect(),
          cursor_rect = this.m_cursor_rect();

      if (content_rect && cursor_rect) {
        return content_rect.top - cursor_rect.top;
      }
    };

    this.m_bottom_off = () => {
      let content_rect = this.m_content_rect(),
          cursor_rect = this.m_cursor_rect();

      if (content_rect && cursor_rect) {
        return content_rect.bottom - cursor_rect.bottom;
      }
    };

    createEffect(() => {
      let res = this.m_bottom_off();

      if (res < 0) {
        read(this._$content_ref).scrollBy(0, -res);
      }
    });
    createEffect(() => {
      let res = this.m_top_off();

      if (res > 0) {
        read(this._$content_ref).scrollBy(0, -res);
      }
    });
    createEffect(on(this._mode[0], (m, pm) => {
      if (m === 1 && pm === 2) {
        this.lines.escape_insert();
      } else if (m === 2 && pm === 1) {
        this.lines.begin_insert();
      }
    }));
  }

  commit_command(command, content) {
    this.on_command(command, content);
  }

  keyDown(code, e) {
    if (this.mode === 1) {
      this.normal_down(code, e);
    } else if (this.mode === 2) {
      this.insert_down(code, e);
    }
  }

  insert_down(code, e) {
    if (e.altKey) ; else if (e.ctrlKey) {
      switch (code) {
        case 'v':
          navigator.clipboard.readText().then(_ => this.lines.paste(_));
          e.preventDefault();
          break;

        case 'h':
          this.lines.delete();
          e.preventDefault();
          break;

        case 'j':
          this.lines.break_line();
          e.preventDefault();
          break;
      }
    } else {
      switch (code) {
        case 'Enter':
          break;

        case 'Shift':
          break;

        case 'Ctrl':
          break;

        case 'Space':
          break;

        case 'Backspace':
          this.lines.delete(code);
          break;

        case 'Escape':
          this.mode = 1;
          break;

        default:
          this.lines.insert(code);
          break;
      }
    }
  }

  normal_down(code, e) {
    if (code === 'Escape') {
      this.lines.escape();
      return;
    }

    if (this.lines.intercept_mode(code)) {
      return;
    }

    if (e.ctrlKey) {
      switch (code) {
        case 'u':
          this.lines.half_page_move(-1);
          e.preventDefault();
          break;

        case 'd':
          this.lines.half_page_move(1);
          e.preventDefault();

        case 'h':
          this.lines.cursor_left_or_up();
          e.preventDefault();
          break;
      }

      return;
    }

    switch (code) {
      case '_':
        this.lines.go_beginning_word0();
        break;

      case ':':
        this.lines.set_command_mode();
        break;

      case 'Enter':
        break;

      case 'Shift':
        break;

      case 'Control':
        break;

      case 'Space':
        break;

      case 'Backspace':
        break;

      case 'Escape':
        this.lines.escape();
        break;

      case 'y':
        this.lines.set_yank();
        break;

      case 'g':
        this.lines.set_g();
        break;

      case 'G':
        this.lines.move_end_of_file();
        break;

      case 'p':
        this.lines.put();
        break;

      case 'u':
        this.lines.undo();
        break;

      case 'r':
        this.lines.set_replace();
        break;

      case 'D':
        this.lines.delete_until_end();
        break;

      case 'd':
        this.lines.set_delete();
        break;

      case 'O':
        this.lines.newline_up();
        this.mode = 2;
        break;

      case 'o':
        this.lines.newline();
        this.mode = 2;
        break;

      case 'i':
        this.mode = 2;
        break;

      case 'x':
        this.lines.delete_under_cursor();
        break;

      case 'a':
        this.lines.cursor_append();
        this.mode = 2;
        break;

      case 'A':
        this.lines.end_of_line();
        this.mode = 2;
        break;

      default:
        this.lines.motion(code);
    }
  }

}
const make_lines = (pen, msg) => {
  let _yank_flag = createSignal(false);

  let _command_flag = createSignal(false);

  let _gg_flag = createSignal(false);

  let _replace = createSignal(false);

  let _delete = createSignal(false);

  let _arr = createSignal(msg.split('\n'), {
    equals: false
  });

  make_position(0, 0);

  let _cursor = make_position(0, 0);

  let a_undos = make_array([], _ => _);

  let _yank = createSignal();

  let _command = createSignal('');

  let a_insert_undo = [];

  function cursor_down() {
    _cursor.y++;
  }

  function append_command(code) {
    if (code.length !== 1) {
      return;
    }

    owrite(_command, _ => _ + code);
  }

  function commit_command() {
    pen.commit_command(read(_command), m_content());
  }

  let m_content = createMemo(() => {
    return read(_arr).join('\n');
  });
  let m_x = createMemo(() => {
    let line = read(_arr)[_cursor.y];

    let l = line.length;
    return Math.min(l, _cursor.x);
  });
  let m_cursor = createMemo(() => {
    return [m_x(), _cursor.y];
  });
  createEffect(on(m_cursor, (c, pre_c) => {
    if (read(_yank_flag)) {
      owrite(_yank_flag, false);

      if (c[1] === pre_c[1]) {
        let min_x = Math.min(c[0], pre_c[0]),
            max_x = Math.max(c[0], pre_c[0]);
        let line = read(_arr)[c[1]].slice(min_x, max_x);
        owrite(_yank, line);
      } else if (c[1] < pre_c[1]) {
        let lines = indexes_between(c[1], pre_c[1]).map(_ => read(_arr)[_]);
        owrite(_yank, lines);
      } else {
        let lines = indexes_between(pre_c[1], c[1]).map(_ => read(_arr)[_]);
        owrite(_yank, lines);
      }
    }
  }));
  createEffect(on(m_cursor, (c, pre_c) => {
    if (read(_delete)) {
      owrite(_delete, false);
      let undos = [];

      if (c[1] === pre_c[1]) {
        let min_x = Math.min(c[0], pre_c[0]),
            max_x = Math.max(c[0], pre_c[0]);
        undos.push(delete_between(min_x, max_x, c[1]));
        _cursor.x = min_x;
      } else if (c[1] < pre_c[1]) {
        undos.unshift(delete_lines(c[1], pre_c[1]));
        _cursor.x = 0;
      } else {
        undos.unshift(delete_lines(pre_c[1], c[1]));
        _cursor.x = 0;
      }

      a_undos.push(() => {
        undos.forEach(_ => _());
      });
    }
  }));
  createEffect(on(_command_flag[0], (v, p) => {
    if (!!v && !p) {
      owrite(_command, ':');
    }

    if (!!p && !v) {
      owrite(_command, '');
    }
  }));

  function delete_lines(y, y2 = y) {
    let removed;
    batch(() => {
      write(_arr, _ => {
        removed = _.splice(y, y2 - y + 1); // don't delete the last line

        if (_.length === 0) {
          _.push("");
        }
      });
      _cursor.y = Math.max(0, Math.min(y, read(_arr).length - 1));
      owrite(_yank, removed);
    });
    return () => {
      write(_arr, _ => {
        _.splice(y, 0, ...removed);
      });
      _cursor.y = y;
    };
  }

  function delete_between(x, x2, y) {
    let removed;
    write(_arr, _ => {
      let line = _[y];
      removed = line.slice(x, x2);
      _[y] = line.slice(0, x) + line.slice(x2);
    });
    owrite(_yank, removed);
    return () => {
      write(_arr, _ => {
        let line = _[y];
        _[y] = line.slice(0, x) + removed + line.slice(x);
      });
    };
  }

  function replace_char(r) {
    let x = m_x();
    let old_r;
    write(_arr, _ => {
      old_r = _[_cursor.y][x];
      _[_cursor.y] = _[_cursor.y].slice(0, x) + r + _[_cursor.y].slice(x + 1);
    });
    let _cursor_y = _cursor.y;
    return () => {
      write(_arr, _ => {
        _[_cursor_y] = _[_cursor_y].slice(0, x) + old_r + _[_cursor_y].slice(x + 1);
      });
      _cursor.y = _cursor_y;
    };
  }

  function yank_line() {
    owrite(_yank, read(_arr)[_cursor.y]);
  }

  let a_line_klasses = createSignal([], {
    equals: false
  });
  return {
    clear_lines() {
      owrite(a_line_klasses, []);
    },

    clear_klass(i) {
      write(a_line_klasses, _ => _[i] = []);
    },

    add_klass(i, klass) {
      write(a_line_klasses, _ => (_[i] = _[i] || []) && _[i].push(klass));
    },

    line_klasses(i) {
      return read(a_line_klasses)[i];
    },

    get command() {
      if (read(_command_flag)) {
        return read(_command);
      }
    },

    set_command_mode() {
      owrite(_command_flag, true);
    },

    put() {
      let yank = read(_yank);

      if (Array.isArray(yank)) {
        let _cursor_y = _cursor.y;

        m_x();

        a_undos.push(() => {
          write(_arr, _ => {
            _.splice(_cursor_y + 1, yank.length);
          });
          _cursor.y = _cursor_y;
        });
        write(_arr, _ => {
          _.splice(_cursor.y + 1, 0, ...yank);
        });
        _cursor.y++;
      } else if (typeof yank === 'string') {
        let line = read(_arr)[_cursor.y];

        let _cursor_y = _cursor.y;

        let _cursor_x = m_x();

        a_undos.push(() => {
          write(_arr, _ => {
            _[_cursor_y] = line;
          });
          _cursor.x = _cursor_x;
          _cursor.y = _cursor_y;
        });
        write(_arr, _ => {
          let line = _[_cursor.y];
          _[_cursor.y] = line.slice(0, m_x() + 1) + yank + line.slice(m_x() + 1);
        });
        _cursor.x = m_x() + 1 + yank.length;
      }
    },

    undo() {
      let undo = a_undos.pop();
      batch(() => {
        undo?.();
      });
    },

    intercept_mode(code) {
      if (read(_yank_flag)) {
        if (code === 'g' || code === 'G') ; else {
          if (code === 'y') {
            yank_line();
            owrite(_yank_flag, false);
          }

          this.motion(code);
          return true;
        }
      }

      if (read(_command_flag)) {
        if (code === 'Enter') {
          commit_command();
          this.escape();
        }

        append_command(code);
        return true;
      }

      if (read(_gg_flag)) {
        owrite(_gg_flag, false);

        if (code === 'g') {
          _cursor.y = 0;
        }

        return true;
      }

      if (read(_replace)) {
        if (code.length > 1) {
          return false;
        }

        owrite(_replace, false);
        a_undos.push(replace_char(code));
        return true;
      }
    },

    set_replace() {
      if (read(_delete)) {
        owrite(_delete, false);
      } else if (read(_replace)) {
        owrite(_replace, false);
        a_undos.push(replace_char('r'));
      } else {
        owrite(_replace, true);
      }
    },

    set_delete() {
      if (read(_replace)) {
        owrite(_replace, false);
        a_undos.push(replace_char('d'));
        return;
      }

      if (read(_delete)) {
        owrite(_delete, false);
        a_undos.push(delete_lines(_cursor.y));
      } else {
        owrite(_delete, true);
      }
    },

    get cursor_x() {
      return m_x();
    },

    get content() {
      return m_content();
    },

    set content(content) {
      batch(() => {
        owrite(_arr, content.split('\n'));
        _cursor.x = 0;
        _cursor.y = 0;
      });
    },

    break_line() {
      write(_arr, _ => {
        let broke_lines = _[_cursor.y].slice(_cursor.x);

        _[_cursor.y] = _[_cursor.y].slice(0, _cursor.x);

        _.splice(_cursor.y + 1, 0, broke_lines);
      });

      let _cursor_y = _cursor.y,
          _cursor_x = m_x();

      a_insert_undo.push(() => {
        write(_arr, _ => {
          let broken_line = _[_cursor_y + 1];
          _[_cursor_y] = _[_cursor_y].slice(0, _cursor_x) + broken_line;

          _.splice(_cursor_y + 1, 1);
        });
      });
      _cursor.x = 0;
      cursor_down();
    },

    newline_up() {
      write(_arr, _ => _.splice(_cursor.y, 0, ""));
      let _cursor_y = _cursor.y;
      a_insert_undo.push(() => {
        write(_arr, _ => {
          _.splice(_cursor_y - 1, 1);
        });
        _cursor.y = _cursor_y;
      });
      _cursor.x = 0;
    },

    newline() {
      write(_arr, _ => _.splice(_cursor.y + 1, 0, ""));
      let _cursor_y = _cursor.y;
      a_insert_undo.push(() => {
        write(_arr, _ => {
          _.splice(_cursor_y + 1, 1);
        });
        _cursor.y = _cursor_y;
      });
      _cursor.x = 0;
      cursor_down();
    },

    end_of_line() {
      _cursor.x = read(_arr)[_cursor.y].length;
    },

    cursor_append() {
      _cursor.x++;
    },

    cursor_left_or_up() {
      let x = m_x();

      if (x > 0) {
        _cursor.x = x - 1;
      } else if (_cursor.y > 0) {
        _cursor.x = read(_arr)[_cursor.y - 1].length;
        _cursor.y--;
      }
    },

    go_beginning_word0() {
      _cursor.x = beginning_of_word0(read(_arr)[_cursor.y]);
    },

    delete_until_end() {
      a_undos.push(delete_between(_cursor.x, read(_arr)[_cursor.y].length, _cursor.y));
    },

    motion(code) {
      let motion = key_motion.indexOf(code);

      let line = read(_arr)[_cursor.y];

      let x = m_x();

      switch (motion) {
        case 0:
          if (x > 0) {
            _cursor.x = x - 1;
          }

          break;

        case 1:
          if (_cursor.y < read(_arr).length - 1) {
            _cursor.y++;
          }

          break;

        case 2:
          if (_cursor.y > 0) {
            _cursor.y--;
          }

          break;

        case 3:
          if (x < read(_arr)[_cursor.y].length - 1) {
            _cursor.x = x + 1;
          }

          break;

        case 4:
          if (x === 0) {
            if (_cursor.y > 0) {
              let pre_line = read(_arr)[_cursor.y - 1];
              _cursor.x = beginning_of_word(pre_line, pre_line.length - 1);
              _cursor.y--;
            }
          } else {
            _cursor.x = beginning_of_word(line, x - 1);
          }

          break;

        case 5:
          if (x === line.length) {
            if (_cursor.y < read(_arr).length) {
              let post_line = read(_arr)[_cursor.y + 1];

              if (post_line === undefined) {
                return;
              }

              _cursor.x = start_of_next_word(post_line, 0);
              _cursor.y++;
            }
          } else {
            _cursor.x = start_of_next_word(line, x);
          }

          break;

        case 6:
          if (x >= line.length - 1) {
            if (_cursor.y < read(_arr).length) {
              let post_line = read(_arr)[_cursor.y + 1];

              if (post_line === undefined) {
                return;
              }

              _cursor.x = end_of_word(post_line, 0);
              _cursor.y++;
            }
          } else {
            _cursor.x = end_of_word(line, x + 1);
          }

          break;

        case 7:
          _cursor.x = Math.max(0, line.length - 1);
          break;

        case 8:
          _cursor.x = 0;
          break;
      }
    },

    get cursor() {
      return _cursor;
    },

    get lines() {
      return read(_arr);
    },

    delete_under_cursor() {
      if (read(_delete)) {
        owrite(_delete, false);
        return;
      }

      a_undos.push(delete_between(_cursor.x, _cursor.x + 1, _cursor.y));
    },

    delete() {
      if (m_x() === 0) {
        return;
      }

      write(_arr, _ => {
        let line = _[_cursor.y];
        _[_cursor.y] = line.slice(0, m_x() - 1) + line.slice(m_x());
      });
      _cursor.x = _cursor.x - 1;
    },

    paste(code) {
      console.log(code);
      code.split('\n').forEach((line, i) => {
        if (i > 0) {
          this.newline();
        }

        line.split('').forEach(_ => this.insert(_));
      });
    },

    insert(code) {
      write(_arr, _ => {
        let line = _[_cursor.y];
        _[_cursor.y] = line.slice(0, m_x()) + code + line.slice(m_x());
      });
      _cursor.x = m_x() + 1;
    },

    begin_insert() {
      let line = read(_arr)[_cursor.y];

      let _cursor_y = _cursor.y;

      let _cursor_x = m_x();

      a_insert_undo.push(() => {
        write(_arr, _ => {
          _[_cursor_y] = line;
        });
        _cursor.x = _cursor_x;
        _cursor.y = _cursor_y;
      });
    },

    escape_insert() {
      let _a = a_insert_undo.slice(0).reverse();

      a_undos.push(() => {
        _a.forEach(_ => _());
      });
      a_insert_undo = [];
    },

    escape() {
      owrite(_yank_flag, false);
      owrite(_command_flag, false);
      owrite(_gg_flag, false);
      owrite(_replace, false);
      owrite(_delete, false);
    },

    move_end_of_file() {
      _cursor.y = read(_arr).length - 1;
    },

    set_g() {
      owrite(_gg_flag, true);
    },

    set_yank() {
      owrite(_yank_flag, true);
    },

    half_page_move(dir) {
      let value = _cursor.y + Math.floor(pen.nb_lines() / 2 * dir);
      _cursor.y = Math.min(read(_arr).length - 1, Math.max(0, value));
    }

  };
};

const _tmpl$ = /*#__PURE__*/template(`<vi-editor tabindex="0"><div class="content"></div><div class="status"></div><div class="prompt"><span></span></div></vi-editor>`),
      _tmpl$2 = /*#__PURE__*/template(`<span>~</span>`),
      _tmpl$3 = /*#__PURE__*/template(`<span></span>`),
      _tmpl$4 = /*#__PURE__*/template(`<span><span class="cursor"></span></span>`);
let mode_text = ['', 'Normal', 'Insert'];
let mode_klass = ['', 'normal', 'insert'];

function format_char(char) {
  if (char === undefined || char === '') {
    return ' ';
  }

  return char;
}

function unbindable(el, eventName, callback, options) {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

const App = pen => () => {
  let unbinds = [];
  unbinds.push(unbindable(document, 'scroll', () => pen.onScroll(), {
    capture: true,
    passive: true
  }));
  unbinds.push(unbindable(window, 'resize', () => pen.onScroll(), {
    passive: true
  }));
  onCleanup(() => {
    unbinds.forEach(_ => _());
  });
  return (() => {
    const _el$ = document.importNode(_tmpl$, true),
          _el$2 = _el$.firstChild,
          _el$3 = _el$2.nextSibling,
          _el$4 = _el$3.nextSibling,
          _el$5 = _el$4.firstChild;

    _el$.$$keydown = _ => pen.keyDown(_.key, _);

    _el$.autofocus = true;
    _el$._$owner = getOwner();

    (_ => setTimeout(() => pen.$content_ref = _))(_el$2);

    insert(_el$2, createComponent(For, {
      get each() {
        return pen.lines.lines;
      },

      children: (line, i) => createComponent(Line, {
        pen: pen,
        line: line,

        get i() {
          return i();
        }

      })
    }), null);

    insert(_el$2, createComponent(For, {
      get each() {
        return pen.empty_lines();
      },

      children: line => _tmpl$2.cloneNode(true)
    }), null);

    insert(_el$3, createComponent(Show, {
      get when() {
        return pen.lines.command;
      },

      get fallback() {
        return (() => {
          const _el$7 = _tmpl$3.cloneNode(true);

          insert(_el$7, () => mode_text[pen.mode]);

          createRenderEffect(() => className(_el$7, ['mode', mode_klass[pen.mode]].join(' ')));

          return _el$7;
        })();
      },

      children: value => (() => {
        const _el$8 = _tmpl$3.cloneNode(true);

        insert(_el$8, value);

        return _el$8;
      })()
    }));

    insert(_el$5, () => pen.prompt);

    return _el$;
  })();
};

const Line = props => {
  let {
    pen
  } = props;

  let klass = () => (pen.line_klasses(props.i) || []).join(' ');

  return createComponent(Show, {
    get when() {
      return props.i === pen.lines.cursor.y;
    },

    get fallback() {
      return (() => {
        const _el$11 = _tmpl$3.cloneNode(true);

        insert(_el$11, () => format_char(props.line));

        createRenderEffect(() => className(_el$11, klass()));

        return _el$11;
      })();
    },

    get children() {
      const _el$9 = _tmpl$4.cloneNode(true),
            _el$10 = _el$9.firstChild;

      insert(_el$9, () => props.line.slice(0, pen.lines.cursor_x), _el$10);

      (_ => setTimeout(() => pen.$cursor_ref = _))(_el$10);

      insert(_el$10, () => format_char(props.line[pen.lines.cursor_x]));

      insert(_el$9, () => props.line.slice(pen.lines.cursor_x + 1), null);

      createRenderEffect(() => className(_el$9, klass()));

      return _el$9;
    }

  });
};

delegateEvents(["keydown"]);

const tutor = `
==============================
= Welcome to OVim Tutorial   =
==============================

OVim is an online editor inspired by Vim, very powerful editor, with many commands.

This page captures your keyboard, including your shortcut keys, so make sure to disable any browser plugins that intercept your keyboard.

Assign "Caps-Lock" to "Ctrl", and "Tab" to "Escape" to use the commands easier.

Press j enough times to move the cursor so that lesson 1.1 completely fills the screen.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 1.1 MOVING THE CURSOR

** To move the cursor, press the h,j,k,l keys as indicated. **

       ^
       k
  < h     l >
       j
       v

 Hold down the j keys so it repeats. Move to lesson 1.3.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 1.3: TEXT EDITING - DELETION

 ** Press  x  to delete the character under the cursor. **

 1. Move the cursor to the line below marked  -->.

 2. To fix the errors, move the cursor on top of the character to delete.

 3. Press  x  to delete the character.

 4. Practice deleting extra characters, until sentence is correct.

--->  The ccow jumpedd ovverr thhe mooon.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Lesson 1.4: TEXT EDITING - INSERTION

    ** Press  i  to insert text. **

 1. Move the cursor to the line below marked -->.

 2. To make the first line the same as the second, move the cursor on top of the first character AFTER where the text is to be inserted.  
 
 3. Press  i  and type the necessary words.

 4. As each error is fixed press <ESC> to return to Normal mode.

--> There is text misng this.
--> There is some text missing from this line.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 1.5: TEXT EDITING - APPENDING

      **  Press  A  to append text. **

 1. Move the cursor to the first line below marked -->.
  It does not matter on what character the cursor is on that line.

 2. Press  A  and type necessary words.

 3. As the text is appended, press <ESC> to return back to Normal mode.

 4. Move the cursor to the second line marked --> and correct the sentence.

--> There is some text missing from th
    There is some text missing from this line.
--> There is also some text miss
    There is also some text missing here.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 2.1: DELETION COMMANDS

      **  Type  dw  to delete a word. **

 1. Press <ESC> to make sure you are in Normal mode.

 2. Move the cursor to the line below marked -->.

 3. Move the cursor to the beginning of a word that needs to be deleted.

 4. Type  dw  to make the word dissapear.

-->  There are a some words fun that don't belong paper in this sentence.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 2.2: MORE DELETION COMMANDS

      **  Type  d$  to delete to the end of the line. **

  1. Press <ESC> to make sure you are in Normal mode.

  2. Move the cursor to the line below marked -->.

  3. Move the cursor at the end of the correct line (After the first . ).

  4. Type  d$  to delete to the end of the line.

--> Somebody typed the end of this line twice. end of this line twice.

  5. Next Lesson 2.3, explains this in detail.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 2.3: ON OPERATORS AND MOTIONS

Many commands that change text are made from an operator and a motion.
The format for a delete command with the  d  delete operator is like:

    d  motion

A short list of motions:

  w - until the start of next word, EXCLUDING its first character.
  e - to the end of the current word, INCLUDING the last character.
  $ - to the end of the line, INCLUDING the last character.


Thus typing  de  will delete from the cursor to the end of the word.

Pressing just the motion while in Normal mode without an operator will move the cursor as specified.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       Lesson 2.6: OPERATING ON LINES

  ** Type  dd  to delete a whole line. **

 1. Move the cursor to the second line in the phrase below.
 2. Type  dd  to delete the line.


--> 1) Roses are red,
--> 2) Mud is fun,
--> 3) Violets are blue.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 2.7: THE UNDO COMMAND

  ** Press  u  to undo the last commands.  **

 1. Move the cursor to the line below marked --> and place it on the first error.
 2. Type x to delete the first unwanted character.
 3. Now type  u  to unde the last command executed.
 4. This time fix all the errors.
 5. Now type  u  a few times to undo the fixes.


--> Fiix the errors oon thhis line and reeplace them witth undo.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Lesson 3.1: THE PUT COMMAND

  ** Type  p  to put previously deleted text after the cursor. **


 1. Move the cursor to the first line below marked --> .

 2. Type dd to delete the line and store it in a Vim register.

 3. Move the cursor to the c) line, ABOVE where the deleted line should go.

 4. Type  p  to put the line below the cursor.

 5. Put the lines all in correct order.

--> d) Can you learn too?
--> b) Violets are blue,
--> c) Intelligence is learned,
--> a) Roses are red,

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Lesson 3.2: THE REPLACE COMMAND

   ** Type  rx  to replace the character at the cursor with  x  . **

  1. Move the cursor to the first line below marked -->.

  2. Move the cursor on top of the first error.

  3. Type  r  and then the character which should be there.

  4. Fix all the errors.

--> Whan this lime was tuoed in, someone presswd some wrojg keys!
--> When this line was typed in, someone pressed some wrong keys!

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 4.1: CURSOR LOCATION

   ** Type  G  to move to a line in the file. **

  NOTE: Read the entire lesson before executing any of the steps!

   1. Press  G  to move to the bottom of the file.
      Type  gg  to move to the start of the file.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   Lesson 6.1: OPEN COMMAND

   ** Type  o  to open a line below the cursor and place you in Insert mode. **

  1. Move the cursor to the first line below marked -->.

  2. Type lowercase letter  o  to open up a line BELOW the cursor and place you in Insert mode.

  3. Now type some text and press <ESC> to exit Insert mode.

--> After typing  o  the cursor is placed on the open line in Insert mode.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   Lesson 6.2: APPEND COMMAND
   
   ** Type  a  to insert text AFTER the cursor. **

  1. Move the cursor to the start of the first line below marked -->.

  2. Press  e  until the cursor is on the end of  li .

  3. Type an  a  (lowercase)  to append text AFTER the cursor.

  4. Complete the word like the line below it. Press <ESC> to exit Insert mode.

  5. Use  e  to move to the next incomplete word and fix errors.

--> This li will allow you to pract appendi text to a line.
--> This line will allow you to practice appending text to a line.

NOTE: a, i and A all go to the same Insert mode, the only difference is where the characters are inserted.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   Lesson 8.1 FASTER NAVIGATION

   ** Type  CTRL-U  or  CTRL-D  to scroll by half page **


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   This concludes the OVim tutorial. 
 `;

function VPro(element, options = {}) {
  let pen = new Pen(options.content || tutor.trim(), options.on_command);
  render(App(pen), element);
  return {
    set prompt(prompt) {
      pen.prompt = prompt;
    },

    set content(content) {
      pen.content = content;
    },

    get content() {
      return pen.content;
    },

    line_klass(i, v) {
      if (!v) {
        pen.lines.clear_klass(i);
      } else {
        pen.lines.add_klass(i, v);
      }
    },

    clear_lines() {
      pen.lines.clear_lines();
    }

  };
}

export { VPro as default };
