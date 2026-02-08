import { authAdminClient } from "@/lib/auth-admin-client";

export async function banUser(
  userId: string,
  banReason: string,
  banExpiresIn?: number,
) {
  const res = await authAdminClient.admin.banUser({
    userId,
    banReason,
    banExpiresIn,
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to ban user");
  }

  return res;
}

export async function unbanUser(userId: string) {
  const res = await authAdminClient.admin.unbanUser({
    userId,
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to unban user");
  }

  return res;
}

export async function deleteUser(userId: string) {
  const res = await authAdminClient.admin.removeUser({
    userId,
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to delete user");
  }

  return res;
}

export async function revokeUserSessions(userId: string) {
  const res = await authAdminClient.admin.revokeUserSessions({
    userId,
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to revoke user sessions");
  }

  return res;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin" | ("user" | "admin")[];
  data?: Record<string, any>;
  autoVerify?: boolean;
}) {
  const { autoVerify, ...userData } = data;

  // If autoVerify is true, add emailVerified to data
  const createData = {
    ...userData,
    data: {
      ...userData.data,
      ...(autoVerify ? { emailVerified: true } : {}),
    },
  };

  const res = await authAdminClient.admin.createUser(createData);

  if (res?.error) {
    throw new Error(res.error.message || "Failed to create user");
  }

  // If not auto-verified, send verification email
  if (!autoVerify) {
    try {
      await sendUserVerificationEmail(data.email, "/dashboard");
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Don't throw here as user was created successfully
    }
  }

  return res;
}

export async function updateUserRole(userId: string, role: string) {
  const res = await authAdminClient.admin.setRole({
    userId,
    role: role as "user" | "admin" | ("user" | "admin")[],
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to update user role");
  }

  return res;
}

export async function updateUserName(userId: string, name: string) {
  const res = await authAdminClient.admin.updateUser({
    userId,
    data: { name },
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to update user name");
  }

  return res;
}

export async function updateUserEmailDirect(
  userId: string,
  email: string,
  options?: { emailVerified?: boolean },
) {
  const data: Record<string, any> = { email };

  if (typeof options?.emailVerified === "boolean") {
    data.emailVerified = options.emailVerified;
  }

  const res = await authAdminClient.admin.updateUser({
    userId,
    data,
  });

  if (res?.error) {
    throw new Error(res.error.message || "Failed to update user email");
  }

  return res;
}

export async function updateUserEmailAndMarkUnverified(
  userId: string,
  email: string,
) {
  return updateUserEmailDirect(userId, email, { emailVerified: false });
}

export async function updateUserEmailAndMarkVerified(
  userId: string,
  email: string,
) {
  return updateUserEmailDirect(userId, email, { emailVerified: true });
}

export async function sendUserVerificationEmail(
  email: string,
  callbackURL = "/dashboard",
) {
  const response = await fetch("/api/admin/users/send-verification-email", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, callbackURL }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "Failed to send verification email";
    throw new Error(message);
  }

  return data;
}

export async function triggerUserEmailChangeVerification(
  userId: string,
  newEmail: string,
  callbackURL = "/dashboard",
) {
  const response = await fetch(
    `/api/admin/users/${encodeURIComponent(
      userId,
    )}/trigger-email-change-verification`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newEmail, callbackURL }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "Failed to trigger email change verification";
    throw new Error(message);
  }

  return data;
}

export async function setUserPassword(userId: string, newPassword: string) {
  const response = await fetch("/api/admin/users/set-password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, newPassword }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "Failed to set user password";
    throw new Error(message);
  }

  return data;
}
