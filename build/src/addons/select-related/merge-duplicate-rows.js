const MANY_RELATIONS = new Set(['hasMany', 'manyToMany', 'hasManyThrough', 'morphMany']);
function treeHasManySideload(tree) {
    for (const name in tree) {
        const e = tree[name];
        if (!e) {
            continue;
        }
        if (MANY_RELATIONS.has(e.relation.type)) {
            return true;
        }
        if (treeHasManySideload(e.subRelations)) {
            return true;
        }
    }
    return false;
}
function mergeTwoSideloadedByTree(base, other, tree) {
    for (const name in tree) {
        const entry = tree[name];
        if (!entry || !entry.sideload) {
            continue;
        }
        const rel = entry.relation;
        if (!MANY_RELATIONS.has(rel.type)) {
            continue;
        }
        const relatedModel = rel.relatedModel();
        const a = base.$preloaded[name];
        const b = other.$preloaded[name];
        const combined = [...(a || []), ...(b || [])];
        base.$preloaded[name] = mergeNestedManyByPk(combined, entry.subRelations, relatedModel);
    }
}
function mergeNestedManyByPk(items, subTree, relatedModel) {
    if (items.length === 0) {
        return items;
    }
    const pkAttr = relatedModel.primaryKey;
    const map = new Map();
    for (const item of items) {
        const key = String(item[pkAttr]);
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(item);
    }
    const out = [];
    for (const [, group] of map) {
        out.push(mergeGroup(group, subTree));
    }
    return out;
}
function mergeGroup(group, tree) {
    if (group.length === 1) {
        return group[0];
    }
    const base = group[0];
    for (let i = 1; i < group.length; i++) {
        mergeTwoSideloadedByTree(base, group[i], tree);
    }
    return base;
}
function mergeRootRowsByPrimaryKey(models, tree) {
    const Model = models[0].constructor;
    const pkAttr = Model.primaryKey;
    const groups = new Map();
    for (const m of models) {
        const key = String(m[pkAttr]);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(m);
    }
    const out = [];
    for (const [, group] of groups) {
        out.push(mergeGroup(group, tree));
    }
    return out;
}
/**
 * Após JOIN em relações `hasMany` / `manyToMany`, o SQL devolve uma linha por filho.
 * Junta instâncias raiz com o mesmo PK e concatena as coleções em `$preloaded`.
 */
export function mergeSelectRelatedDuplicateRootRows(models) {
    if (models.length < 2) {
        return;
    }
    const tree = models[0].$sideloadedRelations;
    if (!tree || !treeHasManySideload(tree)) {
        return;
    }
    const merged = mergeRootRowsByPrimaryKey(models, tree);
    models.length = 0;
    models.push(...merged);
}
//# sourceMappingURL=merge-duplicate-rows.js.map