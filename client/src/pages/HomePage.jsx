import { useProjects } from "../hooks/useProjects";
import { PackageIcon, SparklesIcon } from "lucide-react";
import { Link } from "react-router";
import LoadingSpinner from "../components/LoadingSpinner";
import ProjectCard from "../components/ProjectCard";
import { SignInButton, useAuth } from "@clerk/clerk-react";

function HomePage() {
  const { data: projects, isLoading, error } = useProjects();
  const { isSignedIn } = useAuth();


  if(isLoading) return <LoadingSpinner />;
  if(error) return (
    <div role="alert" className="alert alert-error">
      <span>Something went wrong, Please refresh the page.</span>
    </div>
  );

  return (
  <div className="space-y-10">
    {/* {HERO} */}
    <div className="hero bg-linear-to-br from-base-300 via-base-200 to-base-300 rounded-box overflow-hidden">
      <div className="hero-content flex-col lg:flex-row-reverse gap-10 py-10">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-110" />
          {/* <img
            src="/image.png"
            alt="Creator"
            className="relative h-64 lg:h-72 rounded-2xl shadow-2xl"
          /> */}
        </div>
        <div className="text-center lg:text-left">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            Share Your <span className="text-primary">Study Log</span>
          </h1>
          <p className="py-4 text-base-content/60">
            Upload, discover, and connect with learners.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex space-x-4">
              <SignInButton mode="modal">
                <button className="btn btn-primary">
                  <SparklesIcon className="size-4" />
                  Start Studying
                </button>
              </SignInButton>
              {isSignedIn ? (
                <Link to="/timer" className="btn btn-primary">
                 timer & task
                </Link>
              ) : (
                <SignInButton mode="modal">
                  <button className="btn btn-primary">
                    timer & task
                  </button>
                </SignInButton>
              )}
            </div>
            {!isSignedIn && (
              <p className="text-sm text-base-content/50">
                Please sign in to access the timer feature.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* {PROJECTS} */}
    <div>
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        <PackageIcon className="size-5 text-primary" />
        All Logs
      </h2>

      {projects.length === 0 ? (
        <div className="card bg-base-300">
          <div className="card-body items-center text-center py-16">
            <PackageIcon className="size-16 text-base-content/20" />
            <h3 className="card-title text-base-content/50">No projects yet</h3>
            <p className="text-base-content/40 text-sm">Be the first to share something!</p>
            <Link to="/create" className="btn btn-primary btn-sm mt-2">
              Create project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  </div>
  );
}

export default HomePage;