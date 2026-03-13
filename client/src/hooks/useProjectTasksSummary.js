import { useQuery } from "@tanstack/react-query";
import { getProjectTasksSummary } from "../lib/api";

export const useProjectTasksSummary = (projectId) => {
  return useQuery({
    queryKey: ["project", projectId, "tasks-summary"],
    queryFn: () => getProjectTasksSummary(projectId),
    enabled: !!projectId,
  });
};
