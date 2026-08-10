const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.join(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')
const releaseDir = path.join(rootDir, 'release')

function run() {
  // 1. Read package.json
  const pkgText = fs.readFileSync(pkgPath, 'utf8')
  const pkg = JSON.parse(pkgText)
  const currentVersion = pkg.version

  console.log(`[Build Pipeline] Current version: ${currentVersion}`)

  // 2. Backup old builds if they exist
  if (fs.existsSync(releaseDir)) {
    const backupParentDir = path.join(releaseDir, 'backups')
    const backupDir = path.join(backupParentDir, `v${currentVersion}`)

    // Find all files to archive (exe, blockmap) directly in the release folder
    const filesToBackup = fs.readdirSync(releaseDir).filter(file => {
      return (file.endsWith('.exe') || file.endsWith('.blockmap')) && 
             fs.statSync(path.join(releaseDir, file)).isFile()
    })

    if (filesToBackup.length > 0) {
      console.log(`[Build Pipeline] Backing up old builds of version v${currentVersion}...`)
      if (!fs.existsSync(backupParentDir)) {
        fs.mkdirSync(backupParentDir)
      }
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir)
      }

      try {
        for (const file of filesToBackup) {
          const src = path.join(releaseDir, file)
          const dest = path.join(backupDir, file)
          fs.renameSync(src, dest)
          console.log(`  Archive: Moved ${file} -> release/backups/v${currentVersion}/${file}`)
        }
      } catch (err) {
        if (err.code === 'EBUSY') {
          console.error('\n[Build Pipeline Error] One of the build executables is currently in use/running.')
          console.error('Please close the running ContentGuard application window first, then run build again.\n')
        } else {
          console.error('\n[Build Pipeline Error] Failed to archive old builds:', err.message, '\n')
        }
        process.exit(1)
      }
    } else {
      console.log('[Build Pipeline] No previous builds found in release root to archive.')
    }
  }

  // 3. Increment patch version (X.Y.Z -> X.Y.Z+1)
  const versionParts = currentVersion.split('.').map(Number)
  if (versionParts.length === 3 && !versionParts.some(isNaN)) {
    versionParts[2] += 1
  } else {
    versionParts = [1, 0, 0]
  }
  const nextVersion = versionParts.join('.')
  pkg.version = nextVersion

  console.log(`[Build Pipeline] Incrementing app version to: ${nextVersion}`)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

  // 4. Run Vite build
  console.log('[Build Pipeline] Running Vite production build...')
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

  // 5. Run electron-builder
  console.log('[Build Pipeline] Packaging app with electron-builder...')
  execSync('npx electron-builder', { cwd: rootDir, stdio: 'inherit' })

  console.log(`[Build Pipeline] Success! Version ${nextVersion} has been built. Old version ${currentVersion} has been archived.`)
}

run()
