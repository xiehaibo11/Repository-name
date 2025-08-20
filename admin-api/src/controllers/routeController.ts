import { Request, Response } from 'express';

// 获取异步路由
export const getAsyncRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    // 根据用户角色返回不同的路由
    const userRole = req.admin?.role || 'admin';
    
    // 代理商管理路由
    const agentManagementRouter = {
      path: "/agent",
      name: "Agent",
      redirect: "/agent/index",
      meta: {
        icon: "ep:user-filled",
        title: "代理商管理",
        rank: 2
      },
      children: [
        {
          path: "/agent/index",
          name: "AgentManagement",
          meta: {
            title: "代理商列表",
            roles: ["admin", "super_admin"]
          }
        },
        {
          path: "/agent/credit-logs",
          name: "AgentCreditLogs",
          meta: {
            title: "信用额度日志",
            roles: ["admin", "super_admin"]
          }
        },
        {
          path: "/agent/advanced",
          name: "AdvancedAgentManagement",
          meta: {
            title: "高级代理商管理",
            roles: ["admin", "super_admin"]
          }
        }
      ]
    };

    // 会员管理路由
    const memberManagementRouter = {
      path: "/member",
      name: "Member",
      redirect: "/member/index",
      meta: {
        icon: "ep:avatar",
        title: "会员管理",
        rank: 3
      },
      children: [
        {
          path: "/member/index",
          name: "MemberManagement",
          meta: {
            title: "会员列表",
            roles: ["admin", "super_admin"]
          }
        },
        {
          path: "/member/balance-logs",
          name: "MemberBalanceLogs",
          meta: {
            title: "余额变更日志",
            roles: ["admin", "super_admin"]
          }
        },
        {
          path: "/member/advanced",
          name: "AdvancedMemberManagement",
          meta: {
            title: "高级会员管理",
            roles: ["admin", "super_admin"]
          }
        }
      ]
    };

    // 根据角色过滤路由
    let routes = [];

    // 暂时移除系统管理路由，避免调用不存在的API
    if (userRole === 'super_admin') {
      routes = [agentManagementRouter, memberManagementRouter];
    } else if (userRole === 'admin') {
      routes = [agentManagementRouter, memberManagementRouter];
    } else {
      routes = [agentManagementRouter];
    }

    res.status(200).json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('获取异步路由错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: []
    });
  }
};
