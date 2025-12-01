import { Link } from "react-router-dom";

function Landing() {
  return (
      <div className="landing-box d-flex flex-column mx-auto bg-white text-white min-vh-100">

        {/* LEFT SIDE */}
        <div className="m-0 p-4 d-flex flex-column align-items-center justify-content-start grad-color0 w-100">
          <h1 className="fw-bold bg-transparent text-center text-white my-5 pt-5">
            Welcome to Siakadu - Your Gateway to Academic Excellence!
          </h1>
          <div className="bg-transparent mb-5 px-3 text-justify">
            Siakadu is designed to streamline your academic journey. Whether
            you're a student looking to manage your courses, a faculty member
            aiming to track student progress, or an administrator overseeing
            institutional operations, Siakadu ITLA has got you covered. Our
            platform offers a user-friendly interface, robust features, and
            seamless integration with existing systems to ensure you have
            everything you need at your fingertips.
          </div> <br></br><br></br><br></br>
        </div>

        {/* RIGHT SIDE */}
        <div className="mt-5 p-4 w-70 mx-5 bg-white rounded rounded-5">
          <div className="text-black d-flex flex-column h-50 bg-white justify-content-center align-items-center">
            <h1 className="text-center mx-0 bg-white">
              Explore Our Features
            </h1>
            <p className="bg-white">
              Click this button if you want to go inside the portal
            </p>
          </div>
          <Link
            to="/register"
            className="text-decoration-none py-3 rounded-3 w-100 d-flex justify-content-center align-self-end bg-color1 bg-hover1"
          >
            Start here
          </Link>
        </div>
      </div>
  );
}

export default Landing;
