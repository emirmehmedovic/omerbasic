"use client";

import { useOrigin } from "@/hooks/use-origin";
import { ApiAlert } from "@/components/ui/api-alert";

interface ApiListProps {
  entityName: string;
  entityIdName: string;
}

export const ApiList: React.FC<ApiListProps> = ({
  entityName,
  entityIdName,
}) => {
  const origin = useOrigin();

  const baseUrl = `${origin}/api/${entityName}`;

  return (
    <>
      <ApiAlert
        title="GET"
        variant="public"
        description={`${baseUrl}`}
      />
      <ApiAlert
        title="GET"
        variant="public"
        description={`${baseUrl}/{${entityIdName}}`}
      />
      <ApiAlert
        title="POST"
        variant="admin"
        description={`${baseUrl}`}
      />
      <ApiAlert
        title="PATCH"
        variant="admin"
        description={`${baseUrl}/{${entityIdName}}`}
      />
      <ApiAlert
        title="DELETE"
        variant="admin"
        description={`${baseUrl}/{${entityIdName}}`}
      />
    </>
  );
};
