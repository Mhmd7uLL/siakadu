import { Link } from "react-router-dom";

function LoginMHS() {
  return (
    <div className="regis-MHS container my-5">
      <div className="box-regist d-flex flex-row mx-auto bg-white text-white rounded-5 border border-primary">
        <div className="p-5 grad-color1 w-75 rounded-5 fs-1 fw-bold">
            <h5 className="bg-color1 fw-lighter fs-6">- UNIVERSITY Present -</h5>
            Let's become part of the big family !
        </div>

        <div className="mt-5 p-4 w-75 mx-5 bg-white">
          <h1 className="d-flex justify-content-center mb-5 bg-white text-black">
            Halaman Login
          </h1>
          <form className="mx-auto p-2 text-black rounded w-75 bg-white">
            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Masukkan Email"
                required
              />
            </div>

            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button type="submit" className="rounded-3 w-100 mt-4 bg-color1 bg-hover1 py-2">
              Login
            </button>
            <div className="my-5 text-center fs-6 bg-white">
              Don't have an account? <Link to="/register" className="bg-white">Sign up here</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginMHS;
