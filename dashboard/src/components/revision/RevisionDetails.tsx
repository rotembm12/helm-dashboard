import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  BsPencil,
  BsTrash3,
  BsHourglassSplit,
  BsArrowRepeat,
  BsCheckCircle,
} from "react-icons/bs";
import { Release } from "../../data/types";
import StatusLabel from "../common/StatusLabel";
import { useNavigate, useParams } from "react-router-dom";
import RevisionDiff from "./RevisionDiff";
import RevisionResource from "./RevisionResource";
import Tabs from "../Tabs";
import {
  useGetChartValues,
  useGetLatestVersion,
  useGetRelease,
  useGetReleaseInfoByType,
  useGetResources,
  useGetVersions,
  useRollbackRelease,
  useTestRelease,
} from "../../API/releases";
import { useMutation } from "@tanstack/react-query";
import Modal, { ModalButtonStyle } from "../modal/Modal";
import Spinner from "../Spinner";
import { marked } from "marked";
import hljs from "highlight.js";

type RevisionTagProps = {
  caption: string;
  text: string;
};

type RevisionDetailsProps = {
  release: Release;
  refetchRevisions: () => void;
};

export default function RevisionDetails({
  release,
  refetchRevisions,
}: RevisionDetailsProps) {
  const revisionTabs = [
    { value: "resources", label: "Resources", content: <RevisionResource /> },
    {
      value: "manifests",
      label: "Manifests",
      content: <RevisionDiff tab="manifests" />,
    },
    {
      value: "values",
      label: "Values",
      content: <RevisionDiff includeUserDefineOnly={true} tab="values" />,
    },
    { value: "notes", label: "Notes", content: <RevisionDiff tab="notes" /> },
  ];
  const [showTestsResults, setShowTestResults] = useState(false);
  const [isReconfigureModalOpen, setIsReconfigureModalOpen] = useState(false);

  const { context, namespace, chart, tab } = useParams();

  const {
    data: latestVerData,
    refetch: refetchLatestVersion,
    isLoading: isLoadingLatestVersion,
    isRefetching: isRefetchingLatestVersion,
  } = useGetLatestVersion(release.chart_name, { cacheTime: 0 });

  const selectedTab =
    revisionTabs.find((t) => t.value === tab) || revisionTabs[0];

  const checkUpgradeable = async () => {
    try {
      const response = await axios.get(
        "/api/helm/repositories/latestver?name=" + release.chart_name
      );
      const data = response.data;

      let elm = { name: "", version: "0" };
      // const btnUpgradeCheck = $("#btnUpgradeCheck");
      if (!data || !data.length) {
        //     btnUpgradeCheck.prop("disabled", true)
        //     btnUpgradeCheck.text("")
        //     $("#btnAddRepository").text("Add repository for it").data("suggestRepo", "")
      } else if (data[0].isSuggestedRepo) {
        //     btnUpgradeCheck.prop("disabled", true)
        //     btnUpgradeCheck.text("")
        //     $("#btnAddRepository").text("Add repository for it: "+data[0].repository).data("suggestRepo", data[0].repository).data("suggestRepoUrl", data[0].urls[0])
      } else {
        //     $("#btnAddRepository").text("")
        //     btnUpgradeCheck.text("Check for new version")
        elm = data[0];
      }
    } catch (error) {
      //errorAlert-"Failed to find chart in repo"
    }

    console.error("checkUpgradeable not implemented"); //todo: implement
  };

  const {
    mutate: runTests,
    isLoading: isRunningTests,
    data: testResults,
  } = useTestRelease();
  const handleRunTests = () => {
    setShowTestResults(true);
  };

  const checkForNewVersion = () => {
    throw new Error("checkForNewVersion not implemented"); //todo: implement
  };

  return (
    <div className="flex flex-col px-16 pt-5 gap-3">
      <StatusLabel status="deployed" />
      <div className="flex justify-between">
        <span className="text-[#3d4048] text-4xl">{chart}</span>
        <div className="flex flex-row gap-3">
          <div className="flex flex-col">
            <button onClick={() => setIsReconfigureModalOpen(true)}>
              <span className="flex items-center gap-2 bg-white border border-gray-300 px-5 py-1 text-sm font-semibold">
                {isLoadingLatestVersion || isRefetchingLatestVersion ? (
                  <>
                    <BsHourglassSplit />
                    Checking...
                  </>
                ) : (
                  <>
                    <BsPencil />
                    Reconfigure
                  </>
                )}
              </span>
            </button>
            <ReconfigureModal
              isOpen={isReconfigureModalOpen}
              release={release}
              onClose={() => {
                setIsReconfigureModalOpen(false);
              }}
            />
            {latestVerData?.[0]?.isSuggestedRepo ? (
              <a
                onClick={() => {
                  console.log("implement redirect to repository");
                }}
                className="underline text-sm cursor-pointer"
              >
                Add repository for it: {latestVerData[0].repository}
              </a>
            ) : (
              <span
                onClick={() => refetchLatestVersion()}
                className="underline text-sm cursor-pointer"
              >
                check for new version
              </span>
            )}
          </div>

          {release.namespace && release.chart_name ? (
            <>
              {" "}
              <div className="h-1/2">
                <button onClick={handleRunTests}>
                  <span className="flex items-center gap-2 bg-white border border-gray-300 px-5 py-1 text-sm font-semibold">
                    <BsCheckCircle />
                    Run tests
                  </span>
                </button>
              </div>
              <Modal
                title="Tests results"
                isOpen={showTestsResults}
                onClose={() => setShowTestResults(false)}
                actions={[
                  {
                    id: "1",
                    text: isRunningTests ? "Testing..." : "Run tests",
                    callback: () => {
                      runTests({
                        ns: release.namespace,
                        name: release.chart_name,
                      });
                    },
                    variant: ModalButtonStyle.success,
                    disabled: isRunningTests,
                  },
                ]}
              >
                {isRunningTests ? <Spinner /> : testResults ?? null}
              </Modal>{" "}
            </>
          ) : null}

          <Rollback release={release} refetchRevisions={refetchRevisions} />
          <div className="h-1/2">
            <Uninstall />
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-6">
        <span>
          Revision <span className="font-semibold">#{release.revision}</span>
        </span>
        <span>
          {new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
          }).format(new Date(release.updated))}
        </span>
      </div>
      <div className="flex flex-wrap gap-4">
        <RevisionTag caption="chart version" text={release.chart} />
        <RevisionTag
          caption="app version"
          text={release.app_version || "N/A"}
        />
        <RevisionTag caption="namespace" text={namespace ?? ""} />
        <RevisionTag caption="cluster" text={context ?? ""} />
      </div>
      <span>{release.description}</span>
      <Tabs tabs={revisionTabs} selectedTab={selectedTab} />
    </div>
  );
}

function RevisionTag({ caption, text }: RevisionTagProps) {
  return (
    <span className="bg-[#d6effe] px-2">
      <span>{caption}:</span>
      <span className="font-bold"> {text}</span>
    </span>
  );
}

const Rollback = ({
  release,
  refetchRevisions,
}: {
  release: Release;
  refetchRevisions: () => void;
}) => {
  const { namespace, chart } = useParams();

  const [showRollbackDiff, setShowRollbackDiff] = useState(false);
  const { mutate: rollbackRelease, isLoading: isRollingBackRelease } =
    useRollbackRelease({
      onSettled: () => {
        console.log("settled");
        refetchRevisions();
      },
    });
  const handleRollback = () => {
    setShowRollbackDiff(true);
  };

  const rollbackTitle = (
    <div className="font-semibold text-lg">
      Rollback <span className="text-red-500">{chart}</span> from revision{" "}
      {release.revision} to {release.revision - 1}
    </div>
  );

  if (release.revision <= 1) return null;

  return (
    <>
      <div className="h-1/2">
        <button onClick={handleRollback}>
          <span className="flex items-center gap-2 bg-white border border-gray-300 px-5 py-1 text-sm font-semibold">
            <BsArrowRepeat />
            Rollback to #{release.revision - 1}
          </span>
        </button>
      </div>
      <Modal
        title={rollbackTitle}
        isOpen={showRollbackDiff}
        onClose={() => setShowRollbackDiff(false)}
        actions={[
          {
            id: "1",
            text: isRollingBackRelease ? "Rolling back..." : "Rollback",
            callback: () => {
              rollbackRelease({
                ns: namespace,
                name: String(chart),
                revision: release.revision,
              });
              setShowRollbackDiff(false);
            },
            variant: ModalButtonStyle.success,
            disabled: isRollingBackRelease,
          },
        ]}
      >
        Display diff here
      </Modal>{" "}
    </>
  );
};

const Uninstall = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { namespace = "", chart = "" } = useParams();
  const { data: resources } = useGetResources(namespace, chart, {
    enabled: isOpen,
  });

  const uninstallMutation = useMutation(
    ["uninstall", namespace, chart],
    () =>
      fetch(
        // Todo: Change to BASE_URL from env
        "http://localhost:8080/api/helm/releases/" + namespace + "/" + chart,
        {
          method: "delete",
        }
      ),
    {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (error, variables, context) => {
        // An error happened!
        console.log(`rolling back optimistic update with id `);
      },
    }
  );
  const uninstallTitle = (
    <div className="font-semibold text-lg">
      Uninstall <span className="text-red-500">{chart}</span> from namespace{" "}
      <span className="text-red-500">{namespace}</span>
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        <span className="flex items-center gap-2 bg-white border border-gray-300 px-5 py-1 text-sm font-semibold">
          <BsTrash3 />
          Uninstall
        </span>
      </button>
      {resources?.length ? (
        <Modal
          title={uninstallTitle}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          actions={[
            {
              id: "1",
              text: uninstallMutation.isLoading
                ? "Uninstalling..."
                : "Uninstall",
              callback: uninstallMutation.mutate,
              variant: ModalButtonStyle.error,
              disabled: uninstallMutation.isLoading,
            },
          ]}
        >
          <div>Following resources will be deleted from the cluster:</div>
          <div>
            {resources?.map((resource) => (
              <div className="flex justify-start gap-1 w-full mb-3">
                <span className=" w-1/5  italic">{resource.kind}</span>
                <span className=" w-4/5 font-semibold">
                  {resource.metadata.name}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
};

const ReconfigureModal = ({
  isOpen,
  onClose,
  release,
}: {
  isOpen: boolean;
  onClose: () => void;
  release: Release;
}) => {
  const navigate = useNavigate();
  const { chart_ver } = release;

  const [selectedRepo, setSelectedRepo] = useState("");
  const [userValues, setUserValues] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { chart_name } = release;
  const { data: versions } = useGetVersions(chart_name);
  const { context, namespace, chart } = useParams();

  const [selectedVersion, setSelectedVersion] = useState(chart_ver);
  const { data: chartValues, refetch } = useGetChartValues(
    namespace || "",
    chart_name,
    selectedRepo,
    selectedVersion,
    {
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );

  const setReleaseVersionMutation = useMutation(
    ["setVersion", namespace, chart, selectedVersion, selectedRepo],
    async () => {
      setErrorMessage("");
      const formData = new FormData();
      formData.append("preview", "false");
      formData.append("chart", `${selectedRepo}/${chart_name}`);
      formData.append("version", selectedVersion);
      formData.append("values", userValues);

      const res = await fetch(
        // Todo: Change to BASE_URL from env
        "http://localhost:8080/api/helm/releases/" + namespace + "/" + chart,
        {
          method: "post",
          body: formData,
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    {
      onSuccess: async (res) => {
        onClose();
        navigate(`/`);
      },
      onError: (error, variables, context) => {
        setErrorMessage(error?.message || "Failed to update");
      },
    }
  );

  useEffect(() => {
    if (versions?.length) {
      setSelectedRepo(versions[0].repository);
    }
  }, [versions]);

  useEffect(() => {
    refetch();
  }, [selectedRepo, selectedVersion]);

  const VersionToInstall = () => {
    const currentVersion = `current version is: ${chart_ver}`;

    return (
      <div>
        {versions?.length ? (
          <>
            Version to install:{" "}
            <select
              className="border-2 text-blue-500 rounded"
              onChange={(e) => setSelectedVersion(e.target.value)}
              value={selectedVersion}
              defaultValue={chart_ver}
            >
              {versions?.map(({ repository, version }) => (
                <option
                  value={version}
                  key={version}
                >{`${repository} @ ${version}`}</option>
              ))}
            </select>{" "}
          </>
        ) : null}

        {currentVersion}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Upgrade ${release.chart_name}`}
      containerClassNames="w-[600px]"
      actions={[
        {
          id: "1",
          text: setReleaseVersionMutation.isLoading
            ? "Submitting..."
            : "Confirm",
          callback: setReleaseVersionMutation.mutate,
          variant: ModalButtonStyle.info,
          disabled: setReleaseVersionMutation.isLoading,
        },
      ]}
    >
      <VersionToInstall />
      <GeneralDetails {...release} />
      <div className="flex w-full gap-6 mt-4">
        <UserDefinedValues val={userValues} setVal={setUserValues} />
        <ChartValues chartValues={chartValues} />
      </div>

      <div>
        DIFF PLACEHOLDER
        {/* TODO: Put placeholder here SAPERRRR */}
        {/* use <chartValues> for diff */}
      </div>
      {errorMessage && (
        <div>
          <p className="text-red-600 text-lg">
            Failed to get upgrade info: {errorMessage}
          </p>
        </div>
      )}
    </Modal>
  );
};
const UserDefinedValues = ({ val, setVal }: { val: string; setVal: any }) => {
  return (
    <div className="w-1/2">
      <label
        className="block tracking-wide text-gray-700 text-xl font-medium mb-2"
        htmlFor="grid-user-defined-values"
      >
        User defined values:
      </label>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={14}
        className="block p-2.5 w-full text-sm text-gray-900 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-none"
      ></textarea>
    </div>
  );
};

const GeneralDetails = ({ chart_name }: { chart_name: string }) => {
  const { context, namespace } = useParams();

  return (
    <div className="flex gap-8">
      <div>
        <h4>Release name:</h4>
        <div className="p-2 bg-gray-200 rounded">{chart_name}</div>
      </div>
      <div>
        <h4>Namespace (optional):</h4>
        <div className="p-2 bg-gray-200 rounded">{namespace}</div>
      </div>
      <div>
        <h4>Cluster:</h4>
        <div className="p-2 bg-gray-200 rounded">{context}</div>
      </div>
    </div>
  );
};

const ChartValues = ({ chartValues }: { chartValues: string }) => {
  return (
    <div className="w-1/2">
      <label
        className="block tracking-wide text-gray-700 text-xl font-medium mb-2"
        htmlFor="grid-user-defined-values"
      >
        Chart value reference
      </label>
      <pre
        className=" w-1/2 bg-gray-100 rounded p-4 font-medium text-md w-full max-h-[300px] block overflow-y-auto"
        dangerouslySetInnerHTML={{
          __html: marked(
            hljs.highlight(chartValues || "", { language: "yaml" }).value
          ),
        }}
      />
    </div>
  );
};
