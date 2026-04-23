"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore, FirewallRule, PortForward } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, ArrowRight } from "lucide-react";

export default function FirewallPage() {
  const { piUrl, token } = useStore();
  const { fetchFirewallRules, addFirewallRule, deleteFirewallRule, fetchPortForwards, addPortForward, deletePortForward, refresh } = usePi();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"firewall" | "portforward">("firewall");

  const [newRule, setNewRule] = useState<Partial<FirewallRule>>({
    port: 0,
    protocol: "tcp",
    action: "allow",
    enabled: true,
    description: "",
  });

  const [newForward, setNewForward] = useState<Partial<PortForward>>({
    external_port: 0,
    internal_ip: "",
    internal_port: 0,
    protocol: "tcp",
    enabled: true,
    description: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      await Promise.all([fetchFirewallRules(), fetchPortForwards()]);
      if (mounted) setLoading(false);
    }

    loadData();
    return () => { mounted = false; };
  }, [piUrl, token, fetchFirewallRules, fetchPortForwards]);

  const firewallRules = useStore(state => state.firewallRules);
  const portForwards = useStore(state => state.portForwards);

  const handleAddFirewallRule = async () => {
    if (newRule.port && newRule.description) {
      await addFirewallRule({
        id: crypto.randomUUID(),
        port: newRule.port,
        protocol: newRule.protocol || "tcp",
        action: newRule.action || "allow",
        enabled: newRule.enabled ?? true,
        description: newRule.description,
      } as FirewallRule);
      setNewRule({ port: 0, protocol: "tcp", action: "allow", enabled: true, description: "" });
      await fetchFirewallRules();
    }
  };

  const handleAddPortForward = async () => {
    if (newForward.external_port && newForward.internal_ip && newForward.internal_port) {
      await addPortForward({
        id: crypto.randomUUID(),
        external_port: newForward.external_port,
        internal_ip: newForward.internal_ip,
        internal_port: newForward.internal_port,
        protocol: newForward.protocol || "tcp",
        enabled: newForward.enabled ?? true,
        description: newForward.description,
      } as PortForward);
      setNewForward({ external_port: 0, internal_ip: "", internal_port: 0, protocol: "tcp", enabled: true, description: "" });
      await fetchPortForwards();
    }
  };

  if (loading) {
    return (
      <>
        <TopBar onRefresh={refresh} />
        <div className="p-8">
          <h2>Firewall & Ports</h2>
          <Card>
            <p className="text-text-secondary">Loading...</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar onRefresh={refresh} />
      <div className="p-8">
        <h2>Firewall & Ports</h2>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "firewall" ? "primary" : "secondary"}
            onClick={() => setActiveTab("firewall")}
          >
            <Shield size={16} className="mr-2" />
            Firewall Rules
          </Button>
          <Button
            variant={activeTab === "portforward" ? "primary" : "secondary"}
            onClick={() => setActiveTab("portforward")}
          >
            <ArrowRight size={16} className="mr-2" />
            Port Forwarding
          </Button>
        </div>

        {activeTab === "firewall" && (
          <>
            <Card className="mb-6">
              <h3>Add Firewall Rule</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Port</label>
                  <Input
                    type="number"
                    value={newRule.port || ""}
                    onChange={e => setNewRule({ ...newRule, port: Number(e.target.value) })}
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Protocol</label>
                  <select
                    value={newRule.protocol}
                    onChange={e => setNewRule({ ...newRule, protocol: e.target.value })}
                    className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Action</label>
                  <select
                    value={newRule.action}
                    onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                    className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                  >
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Description</label>
                  <Input
                    value={newRule.description || ""}
                    onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="HTTP server"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddFirewallRule}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h3>Firewall Rules</h3>
              {firewallRules.length === 0 ? (
                <p className="text-text-secondary">No firewall rules configured</p>
              ) : (
<div className="space-y-1">
                  {firewallRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between px-3 py-2 bg-bg-elevated rounded-md ${
                        rule.enabled ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm">{rule.port}</span>
                        <span className="text-xs uppercase text-text-secondary">{rule.protocol}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            rule.action === "allow" ? "bg-green-900/50" : "bg-red-900/50"
                          }`}
                        >
                          {rule.action}
                        </span>
                        <span className="text-sm text-text-secondary">{rule.description}</span>
                      </div>
                      <button
                        onClick={() => {
                          deleteFirewallRule(rule.id);
                          fetchFirewallRules();
                        }}
                        className="p-1.5 hover:bg-bg-deep rounded text-red-brand"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {activeTab === "portforward" && (
          <>
            <Card className="mb-6">
              <h3>Add Port Forward</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Ext Port</label>
                  <Input
                    type="number"
                    value={newForward.external_port || ""}
                    onChange={e => setNewForward({ ...newForward, external_port: Number(e.target.value) })}
                    placeholder="8080"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Protocol</label>
                  <select
                    value={newForward.protocol}
                    onChange={e => setNewForward({ ...newForward, protocol: e.target.value })}
                    className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Int IP</label>
                  <Input
                    value={newForward.internal_ip || ""}
                    onChange={e => setNewForward({ ...newForward, internal_ip: e.target.value })}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Int Port</label>
                  <Input
                    type="number"
                    value={newForward.internal_port || ""}
                    onChange={e => setNewForward({ ...newForward, internal_port: Number(e.target.value) })}
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Description</label>
                  <Input
                    value={newForward.description || ""}
                    onChange={e => setNewForward({ ...newForward, description: e.target.value })}
                    placeholder="Web server"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddPortForward}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h3>Port Forwards</h3>
              {portForwards.length === 0 ? (
                <p className="text-text-secondary">No port forwards configured</p>
              ) : (
                <div className="space-y-1">
                  {portForwards.map(forward => (
                    <div
                      key={forward.id}
                      className={`flex items-center justify-between px-3 py-2 bg-bg-elevated rounded-md ${
                        forward.enabled ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{forward.external_port}</span>
                        <ArrowRight size={14} className="text-text-muted" />
                        <span className="font-mono text-sm">{forward.internal_ip}:{forward.internal_port}</span>
                        <span className="text-xs uppercase text-text-secondary">{forward.protocol}</span>
                        <span className="text-sm text-text-secondary">{forward.description}</span>
                      </div>
                      <button
                        onClick={() => {
                          deletePortForward(forward.id);
                          fetchPortForwards();
                        }}
                        className="p-1.5 hover:bg-bg-deep rounded text-red-brand"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}