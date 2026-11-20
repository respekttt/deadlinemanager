// State: кожен статус знає, куди з нього можна перейти (spec §2, README).
export const TodoState = {
  canTransitionTo: (status) => status === 'in_progress',
};

export const InProgressState = {
  canTransitionTo: (status) => status === 'done' || status === 'todo',
};

export const DoneState = {
  canTransitionTo: () => false,
};

const states = { todo: TodoState, in_progress: InProgressState, done: DoneState };

export function stateOf(status) {
  return states[status];
}
