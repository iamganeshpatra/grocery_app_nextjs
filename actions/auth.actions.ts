"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

type SignUpType = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export const SignUpUsers = async ({
  name,
  email,
  password,
  role,
}: SignUpType) => {
  // check existing user
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  return {
    success: true,
    user,
  };
};