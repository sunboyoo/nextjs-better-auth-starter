type UpdateValues = Record<string, unknown>;

export function withUpdatedAt<T extends UpdateValues>(
  values: T,
  updatedAt: Date = new Date(),
): T & { updatedAt: Date } {
  return {
    ...values,
    updatedAt,
  };
}
