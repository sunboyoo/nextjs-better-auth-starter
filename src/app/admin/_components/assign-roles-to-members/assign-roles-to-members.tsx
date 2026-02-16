"use client";

import {
    Users,
    Shield,
    Check,
    X,
    UserCog,
    Search,
    Plus,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SELECTOR_PAGE_LIMIT } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { OrganizationApplicationSelector } from "./organization-application-selector";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Organization {
    id: string;
    name: string;
    slug: string;
}

interface Application {
    id: string;
    key: string;
    name: string;
    isActive: boolean;
}

interface Member {
    id: string;
    userId: string;
    role: string;
    userName?: string;
    userEmail?: string;
}

interface Role {
    id: string;
    key: string;
    name: string;
    description: string | null;
    isActive: boolean;
}

interface RoleAssignment {
    roleId: string;
    roleName: string;
    roleKey: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
type MutationInput = {
    url: string;
    method: "POST" | "DELETE";
    body?: unknown;
};

export function AssignRolesToMembers() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const urlPage = parseInt(searchParams.get("page") || String(DEFAULT_PAGE));
    const urlLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT));

    const [selectedOrganizationId, setSelectedOrganizationId] = useState(searchParams.get("organizationId") || "");
    const [selectedApplicationId, setSelectedApplicationId] = useState(searchParams.get("applicationId") || "");
    const [page, setPage] = useState(urlPage);
    const [limit] = useState(urlLimit);

    // Dialog state for member roles
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [memberRoleSelections, setMemberRoleSelections] = useState<string[]>([]);
    const [isSavingMemberRoles, setIsSavingMemberRoles] = useState(false);
    const [dialogRoleSearchQuery, setDialogRoleSearchQuery] = useState("");

    // Dialog state for role members
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleMemberSelections, setRoleMemberSelections] = useState<string[]>([]);
    const [isSavingRoleMembers, setIsSavingRoleMembers] = useState(false);
    const [dialogMemberSearchQuery, setDialogMemberSearchQuery] = useState("");

    // Fetch members with pagination
    const membersUrl =
        selectedOrganizationId && selectedOrganizationId !== "all"
            ? `/api/admin/organizations/${selectedOrganizationId}/members?page=${page}&limit=${limit}`
            : null;
    const { data: membersData } = useQuery({
        queryKey: adminKeys.organizationMembers(membersUrl),
        queryFn: () => fetcher(membersUrl!),
        enabled: Boolean(membersUrl),
    });
    const members: Member[] = membersData?.members || [];
    const totalMembers = membersData?.total || 0;
    const totalPages = membersData?.totalPages || 1;

    // Update URL when filters or page change
    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedOrganizationId) params.set("organizationId", selectedOrganizationId);
        if (selectedApplicationId) params.set("applicationId", selectedApplicationId);
        params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`${pathname}?${params.toString()}`);
    }, [selectedOrganizationId, selectedApplicationId, page, limit, router, pathname]);

    // Fetch roles for selected organization + application
    const rolesUrl =
        selectedOrganizationId && selectedApplicationId
            ? `/api/admin/organizations/${selectedOrganizationId}/applications/${selectedApplicationId}/organization-application-roles?limit=${SELECTOR_PAGE_LIMIT}`
            : null;
    const { data: rolesData } = useQuery({
        queryKey: adminKeys.applicationRoles(rolesUrl),
        queryFn: () => fetcher(rolesUrl!),
        enabled: Boolean(rolesUrl),
    });
    const roles: Role[] = rolesData?.roles || [];

    // Search state
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [roleSearchQuery, setRoleSearchQuery] = useState("");

    // Active tab state
    const [activeTab, setActiveTab] = useState("by-member");

    // Filter members
    const filteredMembers = members.filter(member => {
        if (!memberSearchQuery) return true;
        const query = memberSearchQuery.toLowerCase();
        return (
            (member.userName || "").toLowerCase().includes(query) ||
            (member.userEmail || "").toLowerCase().includes(query) ||
            (member.role || "").toLowerCase().includes(query)
        );
    });

    // Fetch member-role assignments for selected organization + application
    const assignmentsUrl =
        selectedOrganizationId && selectedApplicationId
            ? `/api/admin/organizations/${selectedOrganizationId}/applications/${selectedApplicationId}/member-organization-application-roles`
            : null;
    const { data: assignmentsData } = useQuery({
        queryKey: adminKeys.memberApplicationRoles(assignmentsUrl),
        queryFn: () => fetcher(assignmentsUrl!),
        enabled: Boolean(assignmentsUrl),
    });
    const memberRoles: Record<string, RoleAssignment[]> = assignmentsData?.memberRoles || {};

    const requestMutation = useMutation({
        mutationFn: async ({ url, method, body }: MutationInput) =>
            fetch(url, {
                method,
                headers: body === undefined ? undefined : { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
            }),
    });

    // Filter roles
    const filteredRoles = roles.filter(role => {
        if (!roleSearchQuery) return true;
        const query = roleSearchQuery.toLowerCase();
        return (
            role.name.toLowerCase().includes(query) ||
            role.key.toLowerCase().includes(query) ||
            (role.description || "").toLowerCase().includes(query)
        );
    });

    // Paginate filtered roles (client-side)
    const [rolePage, setRolePage] = useState(1);
    const rolesPerPage = DEFAULT_LIMIT;
    const totalFilteredRoles = filteredRoles.length;
    const totalRolePages = Math.ceil(totalFilteredRoles / rolesPerPage) || 1;
    const paginatedRoles = filteredRoles.slice(
        (rolePage - 1) * rolesPerPage,
        rolePage * rolesPerPage
    );

    // Build role-to-members mapping
    const roleMembers: Record<string, string[]> = {};
    Object.entries(memberRoles).forEach(([memberId, rolesList]) => {
        rolesList.forEach(role => {
            if (!roleMembers[role.roleId]) {
                roleMembers[role.roleId] = [];
            }
            roleMembers[role.roleId].push(memberId);
        });
    });

    const openMemberRolesDialog = (member: Member) => {
        setEditingMember(member);
        const currentRoles = memberRoles[member.id] || [];
        setMemberRoleSelections(currentRoles.map(r => r.roleId));
    };

    const saveMemberRoles = async () => {
        if (!editingMember || !selectedOrganizationId || !selectedApplicationId) return;
        setIsSavingMemberRoles(true);

        try {
            const currentRoles = (memberRoles[editingMember.id] || []).map(r => r.roleId);
            const toAdd = memberRoleSelections.filter(id => !currentRoles.includes(id));
            const toRemove = currentRoles.filter(id => !memberRoleSelections.includes(id));

            // Add new roles
            if (toAdd.length > 0) {
                await requestMutation.mutateAsync({
                    url: `/api/admin/organizations/${selectedOrganizationId}/applications/${selectedApplicationId}/members/${editingMember.id}/organization-application-roles`,
                    method: "POST",
                    body: { roleIds: toAdd },
                });
            }

            // Remove roles
            for (const roleId of toRemove) {
                await requestMutation.mutateAsync({
                    url: `/api/admin/organizations/${selectedOrganizationId}/applications/${selectedApplicationId}/members/${editingMember.id}/organization-application-roles?roleId=${roleId}`,
                    method: "DELETE",
                });
            }

            await queryClient.invalidateQueries({
                queryKey: adminKeys.memberApplicationRoles(assignmentsUrl),
            });
            setEditingMember(null);
        } catch (error) {
            console.error("Error saving member roles:", error);
            alert("Failed to save roles");
        } finally {
            setIsSavingMemberRoles(false);
        }
    };

    const openRoleMembersDialog = (role: Role) => {
        setEditingRole(role);
        setRoleMemberSelections(roleMembers[role.id] || []);
    };

    const saveRoleMembers = async () => {
        if (!editingRole || !selectedOrganizationId || !selectedApplicationId) return;
        setIsSavingRoleMembers(true);

        try {
            const currentMembers = roleMembers[editingRole.id] || [];
            const toAdd = roleMemberSelections.filter(id => !currentMembers.includes(id));
            const toRemove = currentMembers.filter(id => !roleMemberSelections.includes(id));

            // Add role to new members
            for (const memberId of toAdd) {
                await requestMutation.mutateAsync({
                    url: `/api/admin/organizations/${selectedOrganizationId}/applications/${selectedApplicationId}/members/${memberId}/organization-application-roles`,
                    method: "POST",
                    body: { roleId: editingRole.id },
                });
            }

            // Remove role from members
            for (const memberId of toRemove) {
                await requestMutation.mutateAsync({
                    url: `/api/admin/organizations/${selectedOrganizationId}/applications/${selectedApplicationId}/members/${memberId}/organization-application-roles?roleId=${editingRole.id}`,
                    method: "DELETE",
                });
            }

            await queryClient.invalidateQueries({
                queryKey: adminKeys.memberApplicationRoles(assignmentsUrl),
            });
            setEditingRole(null);
        } catch (error) {
            console.error("Error saving role members:", error);
            alert("Failed to save members");
        } finally {
            setIsSavingRoleMembers(false);
        }
    };

    const getMemberName = (member: Member) => member.userName || member.userEmail || member.userId;
    const getMemberById = (memberId: string) => members.find(m => m.id === memberId);

    const renderPagination = () => (
        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
            <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{members.length}</span> of <span className="font-medium">{totalMembers}</span> members
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">
                    Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="h-8 w-8 p-0"
                    >
                        <span className="sr-only">Previous page</span>
                        <span aria-hidden="true">‹</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="h-8 w-8 p-0"
                    >
                        <span className="sr-only">Next page</span>
                        <span aria-hidden="true">›</span>
                    </Button>
                </div>
            </div>
        </div>
    );

    const handleOrganizationChange = (organizationId: string) => {
        setSelectedOrganizationId(organizationId);
        setPage(1);
    };

    const handleAppChange = (applicationId: string) => {
        setSelectedApplicationId(applicationId);
        setPage(1);
    };

    const filterControls = (
        <OrganizationApplicationSelector
            selectedOrganizationId={selectedOrganizationId}
            onOrganizationChange={handleOrganizationChange}
            selectedApplicationId={selectedApplicationId}
            onApplicationChange={handleAppChange}
        />
    );

    const membersTable = (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table className="text-sm">
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead className="px-4 py-3">Member</TableHead>
                        <TableHead className="px-4 py-3">Organization Role</TableHead>
                        <TableHead className="px-4 py-3">Organization Application Roles</TableHead>
                        <TableHead className="px-4 py-3 w-[120px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!selectedOrganizationId || !selectedApplicationId ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                Select organization and application to view members.
                            </TableCell>
                        </TableRow>
                    ) : filteredMembers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No members found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredMembers.map((member) => {
                            const assignedRoles = memberRoles[member.id] || [];
                            return (
                                <TableRow key={member.id}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                                                {(member.userName || member.userEmail || "?")[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium">{member.userName || "No name"}</div>
                                                <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline" className="capitalize">{member.role}</Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex flex-col gap-2">
                                            {assignedRoles.length > 0 && (
                                                <Badge variant="outline" className="w-fit h-5 px-1.5 text-[10px] font-normal">
                                                    {assignedRoles.length} roles
                                                </Badge>
                                            )}
                                            <div className="flex flex-col gap-1.5">
                                                {assignedRoles.length === 0 ? (
                                                    <span className="text-muted-foreground text-xs">No roles assigned</span>
                                                ) : (
                                                    assignedRoles.map(role => (
                                                        <div key={role.roleId} className="flex items-center gap-2">
                                                            <UserCog className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-xs">{role.roleName}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openMemberRolesDialog(member)}
                                        >
                                            Update
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
            {selectedOrganizationId && selectedApplicationId && members.length > 0 && renderPagination()}
        </div>
    );

    const rolesTable = (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table className="text-sm">
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead className="px-4 py-3">Organization Application Role</TableHead>
                        <TableHead className="px-4 py-3">Key</TableHead>
                        <TableHead className="px-4 py-3">Description</TableHead>
                        <TableHead className="px-4 py-3">Members</TableHead>
                        <TableHead className="px-4 py-3 w-[120px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!selectedOrganizationId || !selectedApplicationId ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Select organization and application to view roles.
                            </TableCell>
                        </TableRow>
                    ) : filteredRoles.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {roleSearchQuery ? "No roles match your search." : "No roles defined for this application. Create roles in \"Organization Application Roles\" first."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedRoles.map((role) => {
                            const assignedMemberIds = roleMembers[role.id] || [];
                            return (
                                <TableRow key={role.id}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <UserCog className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">{role.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                            {role.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                                        {role.description || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex flex-col gap-3">
                                            <Badge variant="secondary" className="w-fit text-[10px] px-2 py-0.5 h-auto font-medium">
                                                {assignedMemberIds.length} {assignedMemberIds.length === 1 ? 'member' : 'members'}
                                            </Badge>
                                            <div className="flex flex-col gap-1.5">
                                                {assignedMemberIds.length === 0 ? (
                                                    <span className="text-muted-foreground text-xs pl-1">-</span>
                                                ) : (
                                                    assignedMemberIds.map(memberId => {
                                                        const member = getMemberById(memberId);
                                                        if (!member) return null;
                                                        return (
                                                            <div key={memberId} className="flex items-center gap-2">
                                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground border shrink-0">
                                                                    {(member.userName || member.userEmail || "?")[0].toUpperCase()}
                                                                </div>
                                                                <span className="text-xs truncate max-w-[150px]" title={getMemberName(member)}>
                                                                    {getMemberName(member)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openRoleMembersDialog(role)}
                                        >
                                            Update
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
            {selectedOrganizationId && selectedApplicationId && filteredRoles.length > 0 && (
                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{paginatedRoles.length}</span> of <span className="font-medium">{totalFilteredRoles}</span> roles
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground mr-2">
                            Page <span className="font-medium">{rolePage}</span> of <span className="font-medium">{totalRolePages}</span>
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={rolePage === 1}
                                onClick={() => setRolePage(p => Math.max(1, p - 1))}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Previous page</span>
                                <span aria-hidden="true">‹</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={rolePage >= totalRolePages}
                                onClick={() => setRolePage(p => Math.min(totalRolePages, p + 1))}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Next page</span>
                                <span aria-hidden="true">›</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Assign roles to members</h2>
            </div>

            {filterControls}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        {activeTab === "by-member" ? (
                            <Input
                                placeholder="Search members..."
                                className="pl-9 w-full min-w-[280px]"
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                            />
                        ) : (
                            <Input
                                placeholder="Search roles..."
                                className="pl-9 w-full min-w-[280px]"
                                value={roleSearchQuery}
                                onChange={(e) => {
                                    setRoleSearchQuery(e.target.value);
                                    setRolePage(1);
                                }}
                            />
                        )}
                    </div>
                    <TabsList className="w-[280px] grid grid-cols-2">
                        <TabsTrigger value="by-member">
                            By member
                        </TabsTrigger>
                        <TabsTrigger value="by-role">
                            By role
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="by-member" className="mt-0">
                    {membersTable}
                </TabsContent>
                <TabsContent value="by-role" className="mt-0">
                    {rolesTable}
                </TabsContent>
            </Tabs>

            {/* Manage Member Roles Dialog */}
            <Dialog open={!!editingMember} onOpenChange={(open) => {
                if (!open) {
                    setEditingMember(null);
                    setDialogRoleSearchQuery("");
                }
            }}>
                <DialogContent className="sm:max-w-[900px]">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-xl">
                            Assign roles to member
                        </DialogTitle>
                        <DialogDescription>
                            Select roles from the left panel to assign them to this member.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Member Info Card */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-gradient-to-r from-muted/80 to-muted/40 border shadow-sm">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-semibold">
                                {(editingMember?.userName || editingMember?.userEmail || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                {editingMember?.userName ? (
                                    <>
                                        <div className="text-base font-semibold">{editingMember.userName}</div>
                                        <div className="text-sm text-muted-foreground">{editingMember.userEmail}</div>
                                    </>
                                ) : (
                                    <div className="text-base font-semibold">{editingMember?.userEmail}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 pb-2">
                        <div className="grid grid-cols-2 gap-8">
                            {/* Left: Available Roles */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">Available Roles</h4>
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {roles.filter(r => !memberRoleSelections.includes(r.id)).length} available
                                    </Badge>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search roles..."
                                        className="pl-9 h-10"
                                        value={dialogRoleSearchQuery}
                                        onChange={(e) => setDialogRoleSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="border rounded-lg h-[280px] overflow-y-auto bg-background">
                                    {roles.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                            <UserCog className="h-10 w-10 opacity-30" />
                                            <p className="text-sm font-medium">No roles available</p>
                                            <p className="text-xs">Create roles in Organization Application Roles</p>
                                        </div>
                                    ) : (() => {
                                        const availableRoles = roles.filter(role => {
                                            if (memberRoleSelections.includes(role.id)) return false;
                                            if (!dialogRoleSearchQuery) return true;
                                            const query = dialogRoleSearchQuery.toLowerCase();
                                            return (
                                                role.name.toLowerCase().includes(query) ||
                                                role.key.toLowerCase().includes(query) ||
                                                (role.description || "").toLowerCase().includes(query)
                                            );
                                        });

                                        if (availableRoles.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                                    <Check className="h-10 w-10 opacity-30 text-green-500" />
                                                    <p className="text-sm font-medium">{dialogRoleSearchQuery ? "No matching roles" : "All roles assigned"}</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="p-2 space-y-1">
                                                {availableRoles.map(role => (
                                                    <div
                                                        key={role.id}
                                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
                                                        onClick={() => setMemberRoleSelections(prev => [...prev, role.id])}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-background text-muted-foreground transition-colors">
                                                                <UserCog className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium">{role.name}</div>
                                                                <div className="text-xs text-muted-foreground">{role.key}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs font-medium">Add</span>
                                                            <Plus className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Right: Assigned Roles */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">Assigned Roles</h4>
                                    <Badge className="text-xs font-normal">
                                        {memberRoleSelections.length} assigned
                                    </Badge>
                                </div>
                                <div className="h-10" /> {/* Spacer for alignment */}
                                <div className="border rounded-lg h-[280px] overflow-y-auto bg-muted/20">
                                    {memberRoleSelections.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                            <Shield className="h-10 w-10 opacity-30" />
                                            <p className="text-sm font-medium">No roles assigned</p>
                                            <p className="text-xs">Click roles on the left to add</p>
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-1">
                                            {memberRoleSelections.map(roleId => {
                                                const role = roles.find(r => r.id === roleId);
                                                if (!role) return null;
                                                return (
                                                    <div key={roleId} className="flex items-center justify-between p-3 rounded-lg bg-background border shadow-sm group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                <UserCog className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium">{role.name}</div>
                                                                <div className="text-xs text-muted-foreground">{role.key}</div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                                            onClick={() => setMemberRoleSelections(prev => prev.filter(id => id !== roleId))}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => {
                            setEditingMember(null);
                            setDialogRoleSearchQuery("");
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={saveMemberRoles} disabled={isSavingMemberRoles}>
                            {isSavingMemberRoles ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Role Members Dialog */}
            <Dialog open={!!editingRole} onOpenChange={(open) => {
                if (!open) {
                    setEditingRole(null);
                    setDialogMemberSearchQuery("");
                }
            }}>
                <DialogContent className="sm:max-w-[900px]">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-xl">
                            Assign members to role
                        </DialogTitle>
                        <DialogDescription>
                            Select members from the left panel to assign them to this role.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Role Info Card */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-gradient-to-r from-muted/80 to-muted/40 border shadow-sm">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-semibold">
                                <UserCog className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-base font-semibold">{editingRole?.name}</div>
                                <div className="text-sm text-muted-foreground">{editingRole?.key}</div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 pb-2">
                        <div className="grid grid-cols-2 gap-8">
                            {/* Left: Available Members */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">Available Members</h4>
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {members.filter(m => !roleMemberSelections.includes(m.id)).length} available
                                    </Badge>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search members..."
                                        className="pl-9 h-10"
                                        value={dialogMemberSearchQuery}
                                        onChange={(e) => setDialogMemberSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="border rounded-lg h-[280px] overflow-y-auto bg-background">
                                    {members.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                            <Users className="h-10 w-10 opacity-30" />
                                            <p className="text-sm font-medium">No members available</p>
                                            <p className="text-xs">Add members to this organization first</p>
                                        </div>
                                    ) : (() => {
                                        const availableMembers = members.filter(m => {
                                            if (roleMemberSelections.includes(m.id)) return false;
                                            if (!dialogMemberSearchQuery) return true;
                                            const query = dialogMemberSearchQuery.toLowerCase();
                                            return (
                                                (m.userName || "").toLowerCase().includes(query) ||
                                                (m.userEmail || "").toLowerCase().includes(query)
                                            );
                                        });

                                        if (availableMembers.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                                    <Check className="h-10 w-10 opacity-30 text-green-500" />
                                                    <p className="text-sm font-medium">{dialogMemberSearchQuery ? "No matching members" : "All members assigned"}</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="p-2 space-y-1">
                                                {availableMembers.map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
                                                        onClick={() => setRoleMemberSelections(prev => [...prev, member.id])}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted group-hover:bg-background text-muted-foreground font-medium transition-colors">
                                                                {(member.userName || member.userEmail || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                {member.userName ? (
                                                                    <>
                                                                        <div className="text-sm font-medium">{member.userName}</div>
                                                                        <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-sm font-medium">{member.userEmail}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs font-medium">Add</span>
                                                            <Plus className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Right: Assigned Members */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">Assigned Members</h4>
                                    <Badge className="text-xs font-normal">
                                        {roleMemberSelections.length} assigned
                                    </Badge>
                                </div>
                                <div className="h-10" /> {/* Spacer for alignment */}
                                <div className="border rounded-lg h-[280px] overflow-y-auto bg-muted/20">
                                    {roleMemberSelections.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                            <Users className="h-10 w-10 opacity-30" />
                                            <p className="text-sm font-medium">No members assigned</p>
                                            <p className="text-xs">Click members on the left to add</p>
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-1">
                                            {roleMemberSelections.map(memberId => {
                                                const member = members.find(m => m.id === memberId);
                                                if (!member) return null;
                                                return (
                                                    <div key={memberId} className="flex items-center justify-between p-3 rounded-lg bg-background border shadow-sm group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                                                                {(member.userName || member.userEmail || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                {member.userName ? (
                                                                    <>
                                                                        <div className="text-sm font-medium">{member.userName}</div>
                                                                        <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-sm font-medium">{member.userEmail}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                                            onClick={() => setRoleMemberSelections(prev => prev.filter(id => id !== memberId))}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setEditingRole(null)}>
                            Cancel
                        </Button>
                        <Button onClick={saveRoleMembers} disabled={isSavingRoleMembers}>
                            {isSavingRoleMembers ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
