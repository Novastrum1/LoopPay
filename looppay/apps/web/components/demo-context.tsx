"use client";
import { createContext, useContext } from "react";
export const DemoContext = createContext(false);
export const DeploymentContext = createContext(false);
export function useDemo() {
  return useContext(DemoContext);
}
export function useDeploymentReady() {
  return useContext(DeploymentContext);
}
