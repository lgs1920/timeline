/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: serve-demo.mjs
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-16
 * Last modified: 2026-09-16
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {spawn, spawnSync} from 'node:child_process'

const port = 4174

const readPids = (command, argumentsList, parse) => {
    const result = spawnSync(command, argumentsList, {encoding: 'utf8'})
    if (result.error || result.status !== 0) return []
    return parse(result.stdout).filter(pid => pid > 0 && pid !== process.pid)
}

const getListeningPids = () => {
    if (process.platform === 'win32') {
        return readPids('netstat', ['-ano', '-p', 'tcp'], output => output
            .split('\n')
            .filter(line => line.includes(`:${port}`) && line.toUpperCase().includes('LISTENING'))
            .map(line => Number(line.trim().split(/\s+/).at(-1))))
    }

    const lsofPids = readPids('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], output => output
        .split(/\s+/)
        .map(Number))
    if (lsofPids.length > 0) return lsofPids

    return readPids('fuser', ['-n', 'tcp', String(port)], output => output
        .replace(/.*:\s*/, '')
        .split(/\s+/)
        .map(Number))
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const stopExistingServers = async () => {
    const pids = getListeningPids()
    if (pids.length === 0) return

    console.log(`Stopping existing demo server on port ${port} (PID ${pids.join(', ')})`)
    pids.forEach(pid => {
        try {
            process.kill(pid, 'SIGTERM')
        } catch {
            // The process may have exited between discovery and termination.
        }
    })

    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (getListeningPids().length === 0) return
        await wait(100)
    }

    getListeningPids().forEach(pid => {
        try {
            process.kill(pid, 'SIGKILL')
        } catch {
            // The process may have exited between checks.
        }
    })
}

await stopExistingServers()

const server = spawn('bunx', ['--bun', '@11ty/eleventy', '--serve', '--port', String(port)], {
    stdio: 'inherit',
})

const forwardSignal = signal => server.kill(signal)
process.once('SIGINT', () => forwardSignal('SIGINT'))
process.once('SIGTERM', () => forwardSignal('SIGTERM'))

const exitCode = await new Promise(resolve => {
    server.once('error', error => {
        console.error(error.message)
        resolve(1)
    })
    server.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
})

process.exitCode = exitCode
