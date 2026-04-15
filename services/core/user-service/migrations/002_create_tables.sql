USE vpndoc_users;

CREATE TABLE IF NOT EXISTS branches (
  id         CHAR(36)     NOT NULL,
  code       VARCHAR(10)  NOT NULL,
  name       VARCHAR(100) NOT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_branch_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS departments (
  id         CHAR(36)     NOT NULL,
  code       VARCHAR(10)  NOT NULL,
  name       VARCHAR(100) NOT NULL,
  branch_id  CHAR(36)     NOT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_code (code),
  KEY idx_dept_branch (branch_id),
  CONSTRAINT fk_dept_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS users (
  id             CHAR(36)     NOT NULL,
  authentik_id   VARCHAR(100) NULL COMMENT 'authentik user id',
  authentik_pk   INT(11)      NULL COMMENT 'authentik user pk',
  employee_code  VARCHAR(20)  NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL,
  password_hash  VARCHAR(255) NULL,
  role           ENUM(
                   'maker','unit_head','branch','department',
                   'it_head','it_po','it_staff','admin'
                 ) NOT NULL DEFAULT 'maker',
  branch_id      CHAR(36)     NOT NULL,
  department_id  CHAR(36)     NULL,
  is_active      BOOLEAN   NOT NULL DEFAULT TRUE,
  last_login_at  DATETIME(3)  NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                   ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_employee_code (employee_code),
  UNIQUE KEY uq_email         (email),
  UNIQUE KEY uq_authentik_id  (authentik_id),
  KEY idx_role      (role),
  KEY idx_branch    (branch_id),
  KEY idx_is_active (is_active),
  KEY idx_authentik_pk (authentik_pk),
  CONSTRAINT fk_user_branch FOREIGN KEY (branch_id)    REFERENCES branches(id),
  CONSTRAINT fk_user_dept   FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;