import fs from "fs";
import path from "path";
import prisma from "./prisma";

const seedPermission = async () => {
  const filePath = path.join(__dirname, "../..", "permission.json");
  const jsonData = fs.readFileSync(filePath, "utf8");
  const permissions = JSON.parse(jsonData);

  const createdPermissions: {
    action: string;
    module: string;
    description: string;
  }[] = [];

  for (const permission of permissions) {
    for (const action of permission.actions) {
      createdPermissions.push({
        module: permission.module as string,
        action: action as string,
        description: `${permission.module} ${action} permission`,
      });
    }
  }

  for (const permission of createdPermissions) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module: permission.module,
          action: permission.action,
        },
      },
      update: {
        description: permission.description,
      },
      create: permission,
    });
  }

  const findPermission = await prisma.permission.findMany({});
  const findRole = await prisma.role.findFirst({
    where: { isSystemRole: true, name: "SuperAdmin" },
  });

  if (findRole) {
    for (const permission of findPermission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: findRole.id,
            permissionId: permission.id,
          },
        },
        update: {
          isAllowed: true,
        },
        create: {
          roleId: findRole.id,
          permissionId: permission.id,
          isAllowed: true,
        },
      });
    }
  }

  return createdPermissions;
};

export default seedPermission;
