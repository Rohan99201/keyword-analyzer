import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  Container,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Card,
  CardContent,
  Checkbox,
  ListItemText
} from "@mui/material";
import {
  DatePicker,
  LocalizationProvider
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { DataGrid } from "@mui/x-data-grid";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function App() {
  const [treatment, setTreatment] = useState("Gynecomastia");
  const [keywords, setKeywords] = useState([]);
  const [keywordsInAccount, setKeywordsInAccount] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  const [startDate, setStartDate] = useState(dayjs("2025-01-01"));
  const [endDate, setEndDate] = useState(dayjs("2025-08-01"));
  const [compareStart, setCompareStart] = useState(dayjs("2024-09-01"));
  const [compareEnd, setCompareEnd] = useState(dayjs("2024-12-01"));

  // Load main Excel file based on treatment
  useEffect(() => {
    const filePath =
      treatment === "Gynecomastia"
        ? "/data/gynecomastiakeyword.xlsx"
        : "/data/blephaoplastykeywords.xlsx";

    fetch(filePath)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const formatted = data.map((row) => ({
          keyword: row["Keyword"],
          inAccount: row["In Account?"]?.trim() === "Y",
          monthly: Object.entries(row)
            .filter(([k]) => k !== "Keyword" && k !== "In Account?")
            .map(([month, value]) => ({
              month,
              value: Number(value) || 0
            }))
        }));

        setKeywords(formatted);
        setSelectedKeywords(formatted.map((k) => k.keyword)); // select all by default
      });

    // Load In Account? = Y sheet
    const inAccountPath =
      treatment === "Gynecomastia"
        ? "/data/gynecomastiakeywordInAccountY.xlsx"
        : "/data/blephaoplastykeywordsInAccountY.xlsx";

    fetch(inAccountPath)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const formatted = data.map((row) => ({
          keyword: row["Keyword"],
          monthly: Object.entries(row)
            .filter(([k]) => k !== "Keyword")
            .map(([month, value]) => ({
              month,
              value: Number(value) || 0
            }))
        }));

        setKeywordsInAccount(formatted);
      });
  }, [treatment]);

  if (!keywords.length || !keywordsInAccount.length) return <div>Loading...</div>;

  const handleKeywordChange = (event) => {
    const value = event.target.value;
    if (value.includes("Select All")) {
      setSelectedKeywords(keywords.map((k) => k.keyword));
    } else {
      setSelectedKeywords(value);
    }
  };

  const filteredKeywords = keywords.filter((k) =>
    selectedKeywords.includes(k.keyword)
  );

  const filterByRange = (data, start, end) =>
    data.filter((d) => {
      const date = dayjs(d.month);
      return (
        date.isAfter(start.subtract(1, "day")) &&
        date.isBefore(end.add(1, "day"))
      );
    });

  const aggregateMonthly = (keywordList) => {
    const map = {};
    keywordList.forEach((k) => {
      k.monthly.forEach((m) => {
        if (!map[m.month]) map[m.month] = 0;
        map[m.month] += m.value;
      });
    });
    return Object.entries(map).map(([month, value]) => ({ month, value }));
  };

  const filteredCurrent = filterByRange(
    aggregateMonthly(filteredKeywords),
    startDate,
    endDate
  );
  const filteredCompare = filterByRange(
    aggregateMonthly(filteredKeywords),
    compareStart,
    compareEnd
  );

  const totalCurrent = filteredCurrent.reduce((sum, d) => sum + d.value, 0);
  const totalCompare = filteredCompare.reduce((sum, d) => sum + d.value, 0);
  const growth =
    totalCompare > 0
      ? (((totalCurrent - totalCompare) / totalCompare) * 100).toFixed(1)
      : "N/A";

  // Total Searches from In Account? = Y sheet
  const aggregateInAccount = (keywordList) => {
    const map = {};
    keywordList.forEach((k) => {
      k.monthly.forEach((m) => {
        if (!map[m.month]) map[m.month] = 0;
        map[m.month] += m.value;
      });
    });
    return Object.entries(map).map(([month, value]) => ({ month, value }));
  };

  const filteredInAccount = filterByRange(
    aggregateInAccount(keywordsInAccount),
    startDate,
    endDate
  );

  const totalInAccount = filteredInAccount.reduce((sum, d) => sum + d.value, 0);

  // Calculate % of searches in account
  const percentInAccount =
    totalCurrent > 0 ? (100-(totalInAccount / totalCurrent) * 100).toFixed(1) : "N/A";

  const lineChartData = {
    labels: filteredCurrent.map((d) => d.month),
    datasets: [
      {
        label: "Current Period",
        data: filteredCurrent.map((d) => d.value),
        borderColor: "#1976d2",
        backgroundColor: "#1976d2",
        tension: 0.3
      },
      {
        label: "Comparison Period",
        data: filteredCompare.map((d) => d.value),
        borderColor: "#d32f2f",
        backgroundColor: "#d32f2f",
        borderDash: [5, 5],
        tension: 0.3
      }
    ]
  };

  const barChartData = {
    labels: filteredCurrent.map((d) => d.month),
    datasets: [
      {
        label: "Current Period",
        data: filteredCurrent.map((d) => d.value),
        backgroundColor: "#4caf50"
      },
      {
        label: "Comparison Period",
        data: filteredCompare.map((d) => d.value),
        backgroundColor: "#ff9800"
      }
    ]
  };

  const columns = [
    { field: "month", headerName: "Month", flex: 1 },
    { field: "value", headerName: "Search Volume", flex: 1 }
  ];

  const unusedKeywords = keywords.filter((k) => !k.inAccount);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          style={{ margin: "20px 0", fontWeight: "bold" }}
        >
          Keyword Trends Dashboard
        </Typography>

        {/* Treatment + Filters */}
        <Paper elevation={3} style={{ padding: 20, marginBottom: 30 }}>
          <Box display="flex" flexWrap="wrap" gap={3}>
            <FormControl style={{ minWidth: 200 }}>
              <InputLabel>Treatment</InputLabel>
              <Select
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
              >
                <MenuItem value="Gynecomastia">Gynecomastia</MenuItem>
                <MenuItem value="Blepharoplasty">Blepharoplasty</MenuItem>
              </Select>
            </FormControl>

            <FormControl style={{ minWidth: 300 }}>
              <InputLabel>Keyword</InputLabel>
              <Select
                multiple
                value={selectedKeywords}
                onChange={handleKeywordChange}
                renderValue={(selected) => selected.join(", ")}
              >
                <MenuItem value="Select All">
                  <Checkbox
                    checked={selectedKeywords.length === keywords.length}
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                {keywords.map((k) => (
                  <MenuItem key={k.keyword} value={k.keyword}>
                    <Checkbox checked={selectedKeywords.includes(k.keyword)} />
                    <ListItemText primary={k.keyword} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Start Date"
              views={["year", "month"]}
              value={startDate}
              onChange={(newDate) => setStartDate(newDate)}
            />
            <DatePicker
              label="End Date"
              views={["year", "month"]}
              value={endDate}
              onChange={(newDate) => setEndDate(newDate)}
            />

            <DatePicker
              label="Compare Start"
              views={["year", "month"]}
              value={compareStart}
              onChange={(newDate) => setCompareStart(newDate)}
            />
            <DatePicker
              label="Compare End"
              views={["year", "month"]}
              value={compareEnd}
              onChange={(newDate) => setCompareEnd(newDate)}
            />
          </Box>
        </Paper>

        {/* KPI Cards */}
        <Grid container spacing={3} style={{ marginBottom: 30 }}>
          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6">Total Searches</Typography>
                <Typography variant="h4" color="primary">
                  {totalCurrent.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6">Comparison Period</Typography>
                <Typography variant="h4" color="secondary">
                  {totalCompare.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6">Total Searches (In Account)</Typography>
                <Typography variant="h4" color="primary">
                  {totalInAccount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6">% of Searches (In Account)</Typography>
                <Typography
                  variant="h4"
                  style={{ color: percentInAccount >= 0 ? "green" : "red" }}
                >
                  {percentInAccount}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Paper style={{ padding: 40, marginBottom: 30 }}>
          <Typography variant="h6" gutterBottom>
            Line Chart
          </Typography>
          <Line data={lineChartData} />
        </Paper>

        <Paper style={{ padding: 40, marginBottom: 30 }}>
          <Typography variant="h6" gutterBottom>
            Bar Chart
          </Typography>
          <Bar data={barChartData} />
        </Paper>

        {/* Table */}
        <Paper style={{ padding: 20, marginBottom: 30 }}>
          <Typography variant="h6" gutterBottom>
            Data Table
          </Typography>
          <div style={{ height: 400 }}>
            <DataGrid
              rows={filteredCurrent}
              columns={columns}
              getRowId={(row) => row.month}
              disableRowSelectionOnClick
              pageSize={6}
            />
          </div>
        </Paper>

        {/* Unused Keywords Table */}
        <Paper style={{ padding: 20, marginBottom: 30 }}>
          <Typography variant="h6" gutterBottom>
            Used Keywords (In Account)
          </Typography>
          <div style={{ height: 400 }}>
            <DataGrid
              rows={unusedKeywords}
              columns={[{ field: "keyword", headerName: "Keyword", flex: 1 }]}
              getRowId={(row) => row.keyword}
              disableRowSelectionOnClick
              pageSize={6}
            />
          </div>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
}
