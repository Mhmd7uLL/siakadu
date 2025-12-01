import { useState } from "react";

export default function JadwalKuliah() {
  const [selectedDay, setSelectedDay] = useState("Semua Hari");

  const scheduleData = [
    {
      day: "Senin",
      course: "Pengantar Pemrograman",
      time: "08:00 - 10:00",
      room: "R101",
    },
    {
      day: "Selasa",
      course: "Struktur Data",
      time: "10:00 - 12:00",
      room: "R102",
    },
    { day: "Rabu", course: "Basis Data", time: "13:00 - 15:00", room: "R103" },
  ];

  const filteredSchedule =
    selectedDay === "Semua Hari"
      ? scheduleData
      : scheduleData.filter((item) => item.day === selectedDay);

  return (
    <div className="p-4 border mt-3 bg-white rounded-4">
      <h4 className="mb-4 bg-white">Jadwal Kuliah</h4>

      <select
        className="form-select mb-3"
        value={selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}
      >
        <option>Semua Hari</option>
        <option>Senin</option>
        <option>Selasa</option>
        <option>Rabu</option>
      </select>

      <table className="table bg-white">
        <thead>
          <tr>
            <th className="bg-primary text-white">Hari</th>
            <th className="bg-primary text-white">Mata Kuliah</th>
            <th className="bg-primary text-white">Waktu</th>
            <th className="bg-primary text-white">Ruang</th>
          </tr>
        </thead>

        <tbody>
          {filteredSchedule.map((item, index) => (
            <tr key={index}>
              <td>{item.day}</td>
              <td>{item.course}</td>
              <td>{item.time}</td>
              <td>{item.room}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
