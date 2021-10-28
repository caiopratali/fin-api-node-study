const express = require('express');
const { v4: uuid } = require('uuid');

const customers = [];

const app = express();

app.use(express.json());

const verifyIfExistsCPF = (req, res, next) => {
  const { cpf } = req.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if(!customer) return res.status(400).json({ error: 'Customer not found' });

  req.customer = customer;

  return next();
}

const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === 'credit') return acc + operation.amount;

    return acc - operation.amount;
  }, 0);

  return balance;
}

app.post('/account', (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlreadyExists) return res.status(400).json({ error: 'Customer already exists' });

  const customer = {
    id: uuid(),
    cpf,
    name,
    statement: []
  }
  
  customers.push(customer);

  return res.status(201).send();
});

// app.use(verifyIfExistsCPF);

app.get('/account', verifyIfExistsCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer);
});

app.put('/account', verifyIfExistsCPF, (req, res) => {
  const { name } = req.body;

  const { customer } = req;

  customer.name = name;

  return res.status(201).send();
});

app.delete('/account', verifyIfExistsCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(204).send();
});

app.get('/balance', verifyIfExistsCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.json({ total: balance })
});

app.get('/statement/', verifyIfExistsCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer.statement);
});

app.get('/statement/date', verifyIfExistsCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter( (statement) => 
    statement.created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  return res.json(statement);
});

app.post('/deposit', verifyIfExistsCPF, (req, res) => {
  const { description, amount } = req.body;

  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.post('/withdraw', verifyIfExistsCPF, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount) return res.status(400).json({ error: 'Insufficient funds' });

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  }

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.listen(3333);