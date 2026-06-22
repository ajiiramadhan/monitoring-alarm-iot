const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');

const RANGE_MAP = { '1h':'1 hour','24h':'24 hours','7d':'7 days','30d':'30 days' };

async function fetchData(type, range) {
  const interval = RANGE_MAP[range] || '7 days';
  if (type === 'dht11') {
    const r = await query(`SELECT id,temperature,humidity,heat_index,device_id,created_at FROM dht11_readings WHERE created_at>=NOW()-INTERVAL '${interval}' ORDER BY created_at DESC`);
    return { columns: ['id','temperature','humidity','heat_index','device_id','created_at'], rows: r.rows };
  }
  if (type === 'alerts') {
    const r = await query(`SELECT id,sensor_type,message,severity,is_read,created_at FROM alerts WHERE created_at>=NOW()-INTERVAL '${interval}' ORDER BY created_at DESC`);
    return { columns: ['id','sensor_type','message','severity','is_read','created_at'], rows: r.rows };
  }
  if (type === 'buzzer') {
    const r = await query(`SELECT id,status,sensor_trigger,message,device_id,duration_ms,created_at FROM buzzer_logs WHERE created_at>=NOW()-INTERVAL '${interval}' ORDER BY created_at DESC`);
    return { columns: ['id','status','sensor_trigger','message','device_id','duration_ms','created_at'], rows: r.rows };
  }
  const r = await query(`SELECT id,sensor_type,value,unit,device_id,created_at FROM sensor_readings WHERE created_at>=NOW()-INTERVAL '${interval}' ORDER BY created_at DESC`);
  return { columns: ['id','sensor_type','value','unit','device_id','created_at'], rows: r.rows };
}

async function exportReport(req, res) {
  const { type='sensors', range='7d', format='csv' } = req.query;
  try {
    const { columns, rows } = await fetchData(type, range);
    const filename = `report_${type}_${range}`;

    if (format === 'csv') {
      const csv = [columns.join(','), ...rows.map(r => columns.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition',`attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      ws.addRow(columns);
      ws.getRow(1).font = { bold: true };
      rows.forEach(r => ws.addRow(columns.map(c => r[c])));
      res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition',`attachment; filename="${filename}.xlsx"`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename="${filename}.pdf"`);
      doc.pipe(res);
      doc.fontSize(14).text(`Report: ${type.toUpperCase()} (${range})`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(7);
      const cw = (doc.page.width - 60) / columns.length;
      let y = doc.y;
      columns.forEach((c,i) => doc.text(c, 30+i*cw, y, { width: cw, continued: false }));
      y += 16;
      doc.moveTo(30,y).lineTo(doc.page.width-30,y).stroke(); y += 5;
      rows.forEach(row => {
        if (y > doc.page.height - 50) { doc.addPage(); y = 30; }
        columns.forEach((c,i) => doc.text(String(row[c]??'').slice(0,25), 30+i*cw, y, { width: cw }));
        y += 13;
      });
      doc.end(); return;
    }

    res.status(400).json({ success: false, message: 'Format tidak didukung (csv|excel|pdf)' });
  } catch (err) { console.error('[Reports]', err); res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { exportReport };
