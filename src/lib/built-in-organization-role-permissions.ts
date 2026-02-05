import { createAccessControl } from "better-auth/plugins/access";
import {
    defaultStatements,
    ownerAc,
    adminAc,
    memberAc,
} from "better-auth/plugins/organization/access";

/**
 * 组织权限语句定义
 * 基于 better-auth 默认语句，可在此处添加自定义资源和操作
 */
export const statements = {
    ...defaultStatements,
    // 在此添加自定义资源，例如:
    // customResource: ["create", "read", "update", "delete"],
} as const;

/**
 * 使用权限语句创建访问控制器
 */
export const ac = createAccessControl(statements);

/**
 * 使用 better-auth 内置的角色定义
 * owner - 拥有所有权限（包括删除组织）
 * admin - 除删除组织外的所有权限
 * member - 只读权限
 */
export const owner = ac.newRole({
    ...ownerAc.statements,
});

export const admin = ac.newRole({
    ...adminAc.statements,
});

export const member = ac.newRole({
    ...memberAc.statements,
});

export const BUILT_IN_ORGANIZATION_ROLES = [
    {
        id: "owner",
        role: "owner",
        description: "Full access to all organization resources",
        permissions: ownerAc.statements,
        isBuiltIn: true,
    },
    {
        id: "admin",
        role: "admin",
        description: "Administrative access with most permissions",
        permissions: adminAc.statements,
        isBuiltIn: true,
    },
    {
        id: "member",
        role: "member",
        description: "Basic member with limited permissions",
        permissions: memberAc.statements,
        isBuiltIn: true,
    },
];
