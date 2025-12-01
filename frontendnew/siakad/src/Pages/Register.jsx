import { Link } from "react-router-dom";

function RegistMHS() {
  return (
    <div className="grad-color1 min-vh-100 d-flex align-items-center">
    <div className="d-flex flex-column flex-md-row mx-auto rounded-4 bg-transparent">
        {/* LEFT SIDE */}
        <div className="register-box py-4 px-3 bg-white w-100 w-md-50 shadow-lg rounded-4 ms-md-4">
          <h5 className="text-center mb-4 text-black fw-bold bg-white">
            Registrasi
          </h5>
          <form
            className="mx-auto text-black bg-white"
            style={{ width: "90%" }}
          >
            <div className="form-group mb-2 bg-white">
              Nama Lengkap
              <input
                type="text"
                className="form-control rounded-5"
                placeholder="Masukkan Nama Lengkap"
                required
              />
            </div>

            <div className="mb-2 bg-white">
              NIM
              <input
                type="text"
                className="form-control rounded-5"
                placeholder="Masukkan NIM"
                required
              />
            </div>

            <div className="mb-2 bg-white">
              Email
              <input
                type="email"
                className="form-control rounded-5"
                placeholder="Masukkan email"
                required
              />
            </div>

            <div className="mb-2 bg-white">
              Password
              <input
                type="password"
                className="form-control rounded-5"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              className="button rounded-3 w-100 my-4 bg-color1 bg-hover1 py-2 rounded-5"
            >
              Register
            </button>
          </form>
          <div
            className="text-center bg-white my-2"
            style={{ fontSize: "14px" }}
          >
            Sudah ada akun atau seorang dosen?{" "}
            <Link to="/login" className="bg-white">
              Log in
            </Link>
          </div>
        </div>

        {/*Sisi kanan*/}
        <div className="ms-md-4 mt-4 mb-md-0 bg-transparent text-white text-center text-md-start">
          <h6 className="bg-transparent">- UNIVERSITY Present -</h6>
          <h3 className="bg-transparent fw-bold">
            Let's become part of the big family !
          </h3>
        </div>
      </div>
    </div>
  );
}

export default RegistMHS;
