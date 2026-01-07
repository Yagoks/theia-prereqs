// Theia Prereqs (Foundry V13)
// Enforces prerequisites on item creation (including level-up grants)
// Rules live on the Item under: flags.theia.prereqs (Array of {path, op, value, label})

function theiaGet(obj, path) {
  // Safe get for dotted paths, e.g. "system.abilities.cha.value"
  return path.split(".").reduce((o, k) => (o?.[k] ?? undefined), obj);
}

function theiaCompare(left, op, right) {
  switch (op) {
    case ">=": return left >= right;
    case ">":  return left > right;
    case "<=": return left <= right;
    case "<":  return left < right;
    case "==": return left == right; // intentional loose equality for convenience
    case "===":return left === right;
    case "!=": return left != right;
    case "!==":return left !== right;
    default:   return false;
  }
}

function theiaFormatRule(rule) {
  if (rule?.label) return rule.label;
  const p = rule?.path ?? "unknown";
  const op = rule?.op ?? "?";
  const v = rule?.value ?? "?";
  return `${p} ${op} ${v}`;
}

Hooks.on("preCreateItem", (item, data, options, userId) => {
  const actor = item.parent;
  if (!actor) return;

  // Optional policy: only enforce when a player is the one performing the action.
  // If you want to enforce for everyone (including GM), comment this out.
  // if (game.user.isGM) return;

  const prereqs = data?.flags?.theia?.prereqs ?? item?.flags?.theia?.prereqs;
  if (!Array.isArray(prereqs) || prereqs.length === 0) return;

  const failures = [];

  for (const rule of prereqs) {
    const path = rule?.path;
    const op = rule?.op;
    const expected = rule?.value;

    if (!path || !op) {
      failures.push(theiaFormatRule(rule));
      continue;
    }

    const actual = theiaGet(actor, path);

    // If the path doesn't exist, treat as failure (safer than silently passing)
    if (actual === undefined || actual === null) {
      failures.push(theiaFormatRule(rule));
      continue;
    }

    // Numeric compare expected: if expected is numeric, coerce actual to number when possible
    const right = expected;
    const left = (typeof right === "number") ? Number(actual) : actual;

    if (!theiaCompare(left, op, right)) {
      failures.push(theiaFormatRule(rule));
    }
  }

  if (failures.length > 0) {
    const itemName = data?.name ?? item.name ?? "Item";
    ui.notifications.warn(
      `${actor.name} does not meet prerequisites for ${itemName}: ${failures.join(", ")}`
    );
    return false; // blocks the item being created on the actor
  }
});

