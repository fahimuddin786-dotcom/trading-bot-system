const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logStream = fs.createWriteStream(path.join(__dirname, 'combined.log'));

function startProcess(name, command, args, cwd) {
    console.log(`Starting ${name}...`);
    const proc = spawn(command, args, { 
        cwd, 
        shell: true,
        env: { ...process.env, BROWSER: 'none' } 
    });

    proc.stdout.on('data', (data) => {
        const msg = `[${name} STDOUT] ${data}`;
        console.log(msg);
        logStream.write(msg);
    });

    proc.stderr.on('data', (data) => {
        const msg = `[${name} STDERR] ${data}`;
        console.error(msg);
        logStream.write(msg);
    });

    proc.on('close', (code) => {
        const msg = `[${name}] process exited with code ${code}`;
        console.log(msg);
        logStream.write(msg + '\n');
    });

    return proc;
}

// Start backend
startProcess('BACKEND', 'node', ['server.js'], path.join(__dirname, 'backend'));

// Start frontend
startProcess('FRONTEND', 'npm', ['start'], path.join(__dirname, 'frontend'));

console.log('Processes started. Check combined.log for details.');
