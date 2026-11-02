const STORAGE_KEY = 'workspace_app_workspaces'

export function getWorkspaces() {
  try {
    const savedWorkspaces = localStorage.getItem(STORAGE_KEY)

    return savedWorkspaces ? JSON.parse(savedWorkspaces) : []
  } catch {
    return []
  }
}

export function createWorkspace({ name, description }) {
  const workspaces = getWorkspaces()

  const newWorkspace = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),

    ownerId: 'demo-user-1',

    members: [
      {
        userId: 'demo-user-1',
        role: 'admin',
      },
    ],
  }

  const updatedWorkspaces = [...workspaces, newWorkspace]

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedWorkspaces)
  )

  return newWorkspace
}